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

export function isAllowedHost(host: string): boolean {
  const normalized = host.trim().toLowerCase()
  if (!normalized) return false

  let configuredHost = ""
  try {
    configuredHost = new URL(getConfiguredPublicOrigin()).host.toLowerCase()
  } catch {
    configuredHost = "www.chefaugustin.com"
  }

  if (
    normalized === configuredHost ||
    normalized === "www.chefaugustin.com" ||
    normalized === "chefaugustin.com"
  ) {
    return true
  }

  const hostname = normalized.split(":")[0]
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return true
  }

  if (
    process.env.NODE_ENV !== "production" &&
    (hostname.endsWith(".cloudworkstations.dev") || hostname.endsWith(".run.app"))
  ) {
    return true
  }

  return false
}

/**
 * Returns an explicitly authorized origin for redirects.
 * Ignores untrusted client headers such as `x-forwarded-host` or `x-forwarded-proto`.
 * Only allows loopback (`localhost` / `127.0.0.1`) or dev preview origins when actually
 * targeted on those hosts; otherwise forces the configured public origin.
 */
export function getAuthorizedPublicOrigin(reqUrl?: string, hostHeader?: string | null): string {
  const normalizedHostHeader = hostHeader?.trim().toLowerCase() ?? ""
  let candidate = normalizedHostHeader
  if (!candidate && reqUrl) {
    try {
      candidate = new URL(reqUrl).host.toLowerCase()
    } catch {
      candidate = ""
    }
  }

  if (candidate) {
    const hostname = candidate.split(":")[0]
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${candidate}`
    }
    if (
      process.env.NODE_ENV !== "production" &&
      (hostname.endsWith(".cloudworkstations.dev") || hostname.endsWith(".run.app"))
    ) {
      return `https://${candidate}`
    }
  }

  return getConfiguredPublicOrigin()
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
  const secFetchSite = headerStore.get("sec-fetch-site")?.toLowerCase()
  if (secFetchSite === "cross-site") {
    return false
  }

  const origin = headerStore.get("origin")
  if (!origin) {
    return true
  }

  try {
    const originHost = new URL(origin).host.toLowerCase()
    if (!isAllowedHost(originHost)) {
      return false
    }

    const hostHeader = headerStore.get("host")?.trim().toLowerCase() ?? ""
    const forwardedHost = headerStore.get("x-forwarded-host")?.split(",").pop()?.trim().toLowerCase() ?? ""
    const expectedHost =
      (hostHeader && isAllowedHost(hostHeader) ? hostHeader : "") ||
      (forwardedHost && isAllowedHost(forwardedHost) ? forwardedHost : "") ||
      fallbackHost.toLowerCase()

    return Boolean(expectedHost) && originHost === expectedHost
  } catch {
    return false
  }
}

/**
 * Checks that browser-originated state-changing requests come from an explicitly
 * authorized same-origin host. Requests with an explicit `Authorization: Bearer`
 * header bypass this check because browsers never attach Bearer headers cross-site.
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
