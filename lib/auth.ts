import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const encoder = new TextEncoder()

/**
 * Constant-time token verification safe across both Node.js and Edge runtimes.
 * Hashes both inputs with SHA-256 before XOR comparison so secret length never leaks.
 */
export async function verifyDashboardToken(
  provided: string | null | undefined,
  expectedOverride?: string,
): Promise<boolean> {
  const expected = expectedOverride ?? process.env.DASHBOARD_SECRET_TOKEN
  if (!expected || expected.length === 0 || !provided || provided.length === 0) {
    return false
  }

  const [aBuf, bBuf] = await Promise.all([
    globalThis.crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    globalThis.crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ])

  const a = new Uint8Array(aBuf)
  const b = new Uint8Array(bBuf)
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])
const CANONICAL_PUBLIC_ORIGIN = "https://www.chefaugustin.com"

function getConfiguredPublicOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (envUrl) {
    try {
      const parsed = new URL(envUrl)
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        if (parsed.hostname.toLowerCase() === "chefaugustin.com") {
          return CANONICAL_PUBLIC_ORIGIN
        }
        return parsed.origin
      }
    } catch {
      // Fall back to canonical production origin
    }
  }
  return CANONICAL_PUBLIC_ORIGIN
}

const DEFAULT_ALLOWED_HOSTS = new Set([
  "www.chefaugustin.com",
  "chefaugustin.com",
  "localhost",
  "127.0.0.1",
  "ais-dev-4uyvipbr6hgaum7i34nx67-271396358419.europe-west1.run.app",
  "ais-pre-4uyvipbr6hgaum7i34nx67-271396358419.europe-west1.run.app",
])

function isLoopbackHost(host: string): boolean {
  const hostname = host.trim().toLowerCase().split(":")[0]
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

function isInternalOrLoopbackHost(host: string): boolean {
  const hostname = host.trim().toLowerCase().split(":")[0]
  return isLoopbackHost(hostname) || hostname === "0.0.0.0"
}

function normalizeHostValue(raw: string | null | undefined): string {
  if (!raw) return ""
  const first = raw.split(",")[0]?.trim().toLowerCase() ?? ""
  if (!first || /[\s/@\\]/.test(first)) return ""
  if (first.endsWith(":443")) return first.slice(0, -4)
  if (first.endsWith(":80")) return first.slice(0, -3)
  return first
}

function parseConfiguredAllowedEntries(): string[] {
  const sources = [
    process.env.ALLOWED_ORIGINS,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
  const entries: string[] = []
  for (const src of sources) {
    if (!src) continue
    for (const part of src.split(",")) {
      const trimmed = part.trim().toLowerCase()
      if (trimmed) entries.push(trimmed)
    }
  }
  return entries
}

export function isAllowedHost(host: string): boolean {
  const normalized = normalizeHostValue(host)
  if (!normalized) return false

  const hostname = normalized.split(":")[0]

  if (DEFAULT_ALLOWED_HOSTS.has(normalized) || (isLoopbackHost(hostname) && DEFAULT_ALLOWED_HOSTS.has(hostname))) {
    return true
  }

  for (const entry of parseConfiguredAllowedEntries()) {
    try {
      const parsedHost = normalizeHostValue(entry.includes("://") ? new URL(entry).host : entry)
      if (!parsedHost) continue
      const parsedHostname = parsedHost.split(":")[0]
      if (normalized === parsedHost || (isLoopbackHost(hostname) && hostname === parsedHostname)) {
        return true
      }
    } catch {
      const fallbackEntry = normalizeHostValue(entry)
      if (fallbackEntry && normalized === fallbackEntry) {
        return true
      }
    }
  }

  return false
}

/**
 * Resolves the effective request target host.
 * Trusts `x-forwarded-host` ONLY when the direct `host` is an internal/loopback
 * address (reverse-proxy forwarding to local port 3000) AND the forwarded host
 * is an explicitly allowlisted non-loopback origin.
 */
function resolveTrustedTargetHost(
  headerStore: { get(name: string): string | null },
  fallbackHost = "",
): string {
  const directHost = normalizeHostValue(headerStore.get("host")) || normalizeHostValue(fallbackHost)
  const forwardedHost = normalizeHostValue(headerStore.get("x-forwarded-host"))

  if (directHost && !isInternalOrLoopbackHost(directHost)) {
    return directHost
  }

  if (forwardedHost && !isInternalOrLoopbackHost(forwardedHost) && isAllowedHost(forwardedHost)) {
    return forwardedHost
  }

  return directHost
}

/**
 * Returns an explicitly authorized origin for redirects.
 * Ignores untrusted `x-forwarded-host` / `x-forwarded-proto` headers: a forwarded
 * host is honored only behind an internal/loopback `Host` when explicitly allowlisted.
 * Otherwise allows loopback (`localhost` / `127.0.0.1`) or explicit whitelisted hosts,
 * falling back to the configured public origin.
 */
export function getAuthorizedPublicOrigin(
  reqUrl?: string,
  hostHeader?: string | null,
  forwardedHostHeader?: string | null,
): string {
  const normalizedHostHeader = normalizeHostValue(hostHeader)
  const normalizedForwardedHost = normalizeHostValue(forwardedHostHeader)

  let reqUrlHost = ""
  if (reqUrl) {
    try {
      reqUrlHost = normalizeHostValue(new URL(reqUrl).host)
    } catch {
      reqUrlHost = ""
    }
  }

  const directCandidate = normalizedHostHeader || reqUrlHost

  if (directCandidate && !isInternalOrLoopbackHost(directCandidate) && isAllowedHost(directCandidate)) {
    return `https://${directCandidate}`
  }

  if (
    (!directCandidate || isInternalOrLoopbackHost(directCandidate)) &&
    normalizedForwardedHost &&
    !isInternalOrLoopbackHost(normalizedForwardedHost) &&
    isAllowedHost(normalizedForwardedHost)
  ) {
    return `https://${normalizedForwardedHost}`
  }

  if (directCandidate && isAllowedHost(directCandidate)) {
    if (isLoopbackHost(directCandidate)) {
      return `http://${directCandidate}`
    }
    return `https://${directCandidate}`
  }

  return getConfiguredPublicOrigin()
}

/**
 * Returns dashboard session cookie attributes appropriate for the target origin.
 * AI Studio HTTPS preview origins run inside a cross-site iframe, requiring
 * `SameSite=None; Secure; Partitioned`; production and localhost retain `SameSite=Lax`.
 */
export function getDashboardCookieOptions(req: Request): {
  httpOnly: true
  secure: boolean
  sameSite: "lax" | "none"
  partitioned?: boolean
  path: "/"
} {
  let fallbackHost = ""
  try {
    fallbackHost = new URL(req.url).host
  } catch {
    fallbackHost = ""
  }

  const targetHost = resolveTrustedTargetHost(req.headers, fallbackHost)
  const targetHostname = targetHost.split(":")[0]
  const isAiStudioPreview =
    isAllowedHost(targetHost) &&
    !isLoopbackHost(targetHost) &&
    targetHostname.endsWith(".run.app")

  if (isAiStudioPreview) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      path: "/",
    }
  }

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  }
}

/**
 * Extracts the client IP from trusted infrastructure headers (`cf-connecting-ip` or `x-real-ip`).
 * Does not fall back to untrusted `x-forwarded-for` chains.
 */
export function getTrustedClientIp(headerStore: { get(name: string): string | null }): string {
  const cfIp = headerStore.get("cf-connecting-ip")?.trim()
  if (cfIp) return cfIp

  const realIp = headerStore.get("x-real-ip")?.trim()
  if (realIp) return realIp

  return "unknown"
}

export function isSameOriginHeaders(
  headerStore: { get(name: string): string | null },
  fallbackHost = "",
): boolean {
  const secFetchSite = headerStore.get("sec-fetch-site")?.trim().toLowerCase()
  if (secFetchSite === "cross-site") {
    return false
  }

  const origin = headerStore.get("origin")?.trim()
  if (!origin) {
    return true
  }

  let parsedOrigin: URL
  try {
    parsedOrigin = new URL(origin)
  } catch {
    return false
  }

  if (parsedOrigin.protocol !== "https:" && parsedOrigin.protocol !== "http:") {
    return false
  }

  const originHost = normalizeHostValue(parsedOrigin.host)
  if (!originHost || !isAllowedHost(originHost)) {
    return false
  }

  if (!isLoopbackHost(originHost) && parsedOrigin.protocol !== "https:") {
    return false
  }

  const targetHost = resolveTrustedTargetHost(headerStore, fallbackHost)
  if (!targetHost) {
    return false
  }

  return originHost === targetHost
}

/**
 * Checks that browser-originated state-changing requests come from an explicitly
 * authorized same-origin host matching the request target. Requests with an explicit
 * `Authorization: Bearer` header bypass this check because browsers never attach
 * Bearer headers cross-site.
 */
export function isSameOriginRequest(req: Request): boolean {
  let fallbackHost = ""
  try {
    fallbackHost = new URL(req.url).host
  } catch {
    fallbackHost = ""
  }
  return isSameOriginHeaders(req.headers, fallbackHost)
}

export function extractBearerToken(req?: Request): string | null {
  if (!req) return null
  const authHeader = req.headers.get("authorization")
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const bearer = authHeader.slice(7).trim()
    if (bearer) return bearer
  }
  return null
}

/**
 * Extracts dashboard token from either an `Authorization: Bearer <token>` header
 * or the `dashboard_auth` HttpOnly cookie.
 */
export async function extractRequestDashboardToken(req?: Request): Promise<string | null> {
  const bearer = extractBearerToken(req)
  if (bearer) return bearer

  try {
    const cookieStore = await cookies()
    return cookieStore.get("dashboard_auth")?.value ?? null
  } catch {
    return null
  }
}

/**
 * Guards private Studio / internal API routes.
 * Enforces constant-time token verification AND same-origin CSRF validation
 * for cookie-authenticated mutations.
 */
export async function requireDashboardAuth(req?: Request): Promise<NextResponse | null> {
  const token = await extractRequestDashboardToken(req)
  const valid = await verifyDashboardToken(token)
  if (!valid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  }

  const hasBearer = Boolean(extractBearerToken(req))
  if (req && !hasBearer && MUTATING_METHODS.has(req.method.toUpperCase())) {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json(
        { error: "Forbidden: cross-origin request rejected." },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )
    }
  }

  return null
}
