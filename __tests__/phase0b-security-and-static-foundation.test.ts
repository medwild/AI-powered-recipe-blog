import { describe, expect, it, beforeEach, afterEach } from "vitest"
import robots from "@/app/robots"
import { verifyDashboardToken, requireDashboardAuth } from "@/lib/auth"
import { middleware } from "@/middleware"
import { NextRequest } from "next/server"
import { generateHtaccessContent } from "@/scripts/generate-htaccess"
import {
  scanSerializedSnapshotForLeaks,
  validatePublicSnapshot,
} from "@/scripts/public-snapshot-schema"

describe("Phase 0B Security: Constant-time auth & route guards", () => {
  const prevToken = process.env.DASHBOARD_SECRET_TOKEN

  beforeEach(() => {
    process.env.DASHBOARD_SECRET_TOKEN = "super-secret-studio-token-123"
  })

  afterEach(() => {
    if (prevToken === undefined) {
      delete process.env.DASHBOARD_SECRET_TOKEN
    } else {
      process.env.DASHBOARD_SECRET_TOKEN = prevToken
    }
  })

  it("verifies dashboard tokens safely across valid, mismatched, empty, and missing-secret cases", async () => {
    expect(await verifyDashboardToken("super-secret-studio-token-123")).toBe(true)
    expect(await verifyDashboardToken("wrong-token")).toBe(false)
    expect(await verifyDashboardToken("")).toBe(false)
    expect(await verifyDashboardToken(null)).toBe(false)

    delete process.env.DASHBOARD_SECRET_TOKEN
    expect(await verifyDashboardToken("super-secret-studio-token-123")).toBe(false)
    expect(await verifyDashboardToken("")).toBe(false)
  })

  it("returns 401 on requireDashboardAuth when unauthenticated and null when valid Bearer token is provided", async () => {
    const unauthReq = new Request("http://localhost:3000/api/recipes/generate", { method: "POST" })
    const unauthRes = await requireDashboardAuth(unauthReq)
    expect(unauthRes?.status).toBe(401)

    const validReq = new Request("http://localhost:3000/api/recipes/generate", {
      method: "POST",
      headers: { Authorization: "Bearer super-secret-studio-token-123" },
    })
    const validRes = await requireDashboardAuth(validReq)
    expect(validRes).toBeNull()
  })

  it("redirects unauthenticated /dashboard requests with HTTP 307 and X-Robots-Tag: noindex, nofollow", async () => {
    const req = new NextRequest("http://localhost:3000/dashboard")
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost:3000/login")
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow")
  })

  it("allows authenticated /dashboard requests with X-Robots-Tag: noindex, nofollow", async () => {
    const req = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "dashboard_auth=super-secret-studio-token-123" },
    })
    const res = await middleware(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow")
  })

  it("applies X-Robots-Tag: noindex, follow on filtered /recipes?cat=quick", async () => {
    const req = new NextRequest("http://localhost:3000/recipes?cat=quick")
    const res = await middleware(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("x-robots-tag")).toBe("noindex, follow")
  })

  it("disallows /dashboard, /login, and /api/ for ALL bots in robots.ts", () => {
    const r = robots()
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules]
    expect(rules.length).toBeGreaterThanOrEqual(5)
    for (const rule of rules) {
      expect(rule.disallow).toContain("/dashboard")
      expect(rule.disallow).toContain("/login")
      expect(rule.disallow).toContain("/api/")
      expect(rule.allow).toContain("/api/recipes/raw")
    }
  })
})

describe("Static Migration Foundation: .htaccess isolation & snapshot leak guards", () => {
  it("generates isolated staging .htaccess without canonical redirect to production", async () => {
    const htaccess = await generateHtaccessContent({ env: "staging" })
    expect(htaccess).toContain('Header always set X-Robots-Tag "noindex, nofollow"')
    expect(htaccess).not.toContain("https://www.chefaugustin.com/$1 [R=301,L]")
    expect(htaccess).toContain('Header always set Access-Control-Allow-Origin "*"')
    expect(htaccess).toContain("RewriteRule ^(.+?)/?$ $1.html [L]")
  })

  it("generates production .htaccess with canonical www redirect, 308 /recettes rules, and PinScheduler CORS", async () => {
    const htaccess = await generateHtaccessContent({ env: "production" })
    expect(htaccess).toContain("https://www.chefaugustin.com/$1 [R=301,L]")
    expect(htaccess).toContain("RewriteRule ^recettes/chicken-dinner-for-two/?$ /recipes/chicken-dinner-for-two [R=308,L]")
    expect(htaccess).toContain('Header always set X-Robots-Tag "noindex, follow" env=NOINDEX_RECIPES')
    expect(htaccess).toContain('Header always set Access-Control-Allow-Origin "*"')
  })

  it("detects leaked private fields and secrets in snapshot payloads", () => {
    const leaky = JSON.stringify({
      schemaVersion: "1.0.0",
      recipes: [{ id: 1, workflowLog: [], serpData: {} }],
      connection: "postgresql://user:pass@ep-test.neon.tech/db",
    })
    const hits = scanSerializedSnapshotForLeaks(leaky)
    expect(hits).toContain("private_field_workflowLog")
    expect(hits).toContain("private_field_serpData")
    expect(hits).toContain("postgres_connection_string")

    const invalid = validatePublicSnapshot({ schemaVersion: "1.0.0", recipes: [{ id: -1 }] })
    expect(invalid.ok).toBe(false)
  })
})
