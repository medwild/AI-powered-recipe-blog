import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { Pool } from "pg"

// Mutable request context mocks for cookies() / headers() used in Route Handlers & Server Actions
let mockCookieToken: string | undefined
let mockHeadersMap = new Map<string, string>()

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "dashboard_auth" && mockCookieToken !== undefined
        ? { value: mockCookieToken }
        : undefined,
  }),
  headers: async () => ({
    get: (name: string) => mockHeadersMap.get(name.toLowerCase()) ?? null,
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

// Mock DB layer completely so zero Neon reads/writes occur during isolated gate tests
const mockDbState = {
  selectRows: [] as Array<Record<string, unknown>>,
  updateReturning: [] as Array<Record<string, unknown>>,
  deleteReturning: [] as Array<Record<string, unknown>>,
  insertReturning: [{ id: 999 }] as Array<Record<string, unknown>>,
  findFirstResult: null as Record<string, unknown> | null,
}

function makeChain(getRows: () => unknown[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    set: () => chain,
    values: () => chain,
    returning: () => Promise.resolve(getRows()),
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(getRows()).then(onFulfilled, onRejected),
  }
  return chain
}

vi.mock("@/lib/db", () => ({
  pool: {
    options: {
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      allowExitOnIdle: true,
    },
    query: async () => ({ rows: [] }),
    connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
  },
  db: {
    select: () => makeChain(() => mockDbState.selectRows),
    update: () => makeChain(() => mockDbState.updateReturning),
    delete: () => makeChain(() => mockDbState.deleteReturning),
    insert: () => makeChain(() => mockDbState.insertReturning),
    query: {
      recipes: {
        findFirst: async () => mockDbState.findFirstResult,
      },
    },
  },
}))

vi.mock("@/lib/generate-recipe-pure", () => ({
  generateRecipe: vi.fn(async () => {}),
}))

vi.mock("@/lib/pre-generation-gate", () => ({
  preGenerationGate: vi.fn(async () => ({ verdict: "pass" })),
}))

vi.mock("@/lib/seo/gate", () => ({
  runSeoGate: vi.fn(async () => ({ status: "PASS", summary: "ok", checks: [] })),
}))

vi.mock("@/lib/pipeline/steps/serp-phase", () => ({
  runSerpPhase: vi.fn(async () => ({ serpText: "" })),
}))

vi.mock("@/lib/pipeline/agents/chef-augustin", () => ({
  agentChefAugustinMega: vi.fn(async () => ({ contentMarkdown: "Test recipe" })),
  recipeArticleToChefAugustinOutput: vi.fn((a) => a),
}))

vi.mock("@/lib/pipeline/steps/persist-phase", () => ({
  persistFinalDraft: vi.fn(async () => {}),
}))

vi.mock("@/lib/pipeline/helpers", () => ({
  appendLog: vi.fn(async () => {}),
  logEntry: vi.fn(() => ({})),
}))

vi.mock("@/lib/quality-gate", () => ({
  qualityGate: vi.fn(async () => ({ status: "PASS", errors: [] })),
}))

vi.mock("@/lib/internal-linker", () => ({
  insertContextualLinksBatch: vi.fn((md: string) => ({ markdown: md, links: [] })),
  logInternalLinks: vi.fn(async () => {}),
}))

vi.mock("@/lib/public-data", () => ({
  getRecipeBySlug: vi.fn(async (slug: string) =>
    slug === "sample-chicken" ? { slug: "sample-chicken" } : null,
  ),
}))

vi.mock("@/lib/queries", () => ({
  getRecipeBySlug: vi.fn(async (slug: string) =>
    slug === "sample-chicken" ? { slug: "sample-chicken" } : null,
  ),
  getCalibrationStats: vi.fn(async () => ({
    calibrationReady: false,
    totalDataPoints: 5,
    averageAiScore: 18,
    minAiScore: 10,
    maxAiScore: 25,
    recentAverageAiScore: 16,
    criteriaAverages: [{ criterion: "tone", averageScore: 17, count: 5 }],
    tagAverages: [{ tag: "quick", averageAiScore: 18, count: 5 }],
    sourceBreakdown: { synthetic: 5 },
  })),
}))

import { middleware } from "@/middleware"
import {
  getAuthorizedPublicOrigin,
  getTrustedClientIp,
  isSameOriginRequest,
  requireDashboardAuth,
} from "@/lib/auth"
import { GET as legacyRecetteGET } from "@/app/recettes/[slug]/route"
import { GET as loginGET, POST as loginPOST } from "@/app/api/auth/login/route"
import { POST as logoutPOST } from "@/app/api/auth/logout/route"
import { POST as generatePOST } from "@/app/api/recipes/generate/route"
import { GET as statusGET } from "@/app/api/recipes/[id]/status/route"
import { POST as approvePOST } from "@/app/api/recipes/[id]/approve/route"
import { POST as cancelPOST } from "@/app/api/recipes/[id]/cancel/route"
import { POST as regeneratePOST } from "@/app/api/internal/regenerate-recipe/route"
import { POST as backfillPOST } from "@/app/api/internal/backfill-links/route"
import { GET as calibrationGET } from "@/app/api/self-improvement/calibration/route"
import { GET as articlesRawGET } from "@/app/api/articles/raw/route"
import { GET as articleSlugRawGET } from "@/app/api/articles/raw/[slug]/route"
import {
  approveRecipe,
  cancelRecipe,
  deleteRecipe,
  publishRecipe,
  unpublishRecipe,
} from "@/app/actions/recipes"
import { deleteArticle, publishArticle } from "@/app/actions/articles"

const TEST_SECRET = "ephemeral-gate-secret-token-2026-x9z"

describe("Phase 0B Final Security Gate — Auth, Cookie, CSRF, Rate Limit & Proxy", () => {
  const prevSecret = process.env.DASHBOARD_SECRET_TOKEN

  beforeEach(() => {
    process.env.DASHBOARD_SECRET_TOKEN = TEST_SECRET
    mockCookieToken = undefined
    mockHeadersMap = new Map()
    mockDbState.selectRows = []
    mockDbState.updateReturning = []
    mockDbState.deleteReturning = []
    mockDbState.insertReturning = [{ id: 999 }]
    mockDbState.findFirstResult = null
  })

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.DASHBOARD_SECRET_TOKEN
    else process.env.DASHBOARD_SECRET_TOKEN = prevSecret
  })

  it("authenticates via POST JSON, validates cookie flags (including Secure in production), rejects invalid secrets & GET, and cleans session on logout", async () => {
    // 1. GET /api/auth/login is disabled (405)
    const getRes = await loginGET()
    expect(getRes.status).toBe(405)
    expect(getRes.headers.get("allow")).toBe("POST")

    // 2. Invalid secret rejected with 401 and no cookie
    const badLoginReq = new NextRequest("https://www.chefaugustin.com/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://www.chefaugustin.com",
        host: "www.chefaugustin.com",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({ token: "wrong-secret" }),
    })
    const badLoginRes = await loginPOST(badLoginReq)
    expect(badLoginRes.status).toBe(401)
    expect(badLoginRes.headers.get("set-cookie")).toBeNull()

    // 3. Valid login in production mode emits HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=604800
    vi.stubEnv("NODE_ENV", "production")
    try {
      const okLoginReq = new NextRequest("https://www.chefaugustin.com/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://www.chefaugustin.com",
          host: "www.chefaugustin.com",
          "x-forwarded-for": "203.0.113.11",
        },
        body: JSON.stringify({ token: TEST_SECRET }),
      })
      const okLoginRes = await loginPOST(okLoginReq)
      expect(okLoginRes.status).toBe(200)
      const setCookie = okLoginRes.headers.get("set-cookie") ?? ""
      expect(setCookie).toContain("dashboard_auth=")
      expect(setCookie).toContain("HttpOnly")
      expect(setCookie).toContain("Secure")
      expect(setCookie.toLowerCase()).toContain("samesite=lax")
      expect(setCookie).toContain("Path=/")
      expect(setCookie).toContain("Max-Age=604800")
      const jsonBody = await okLoginRes.text()
      expect(jsonBody).not.toContain(TEST_SECRET)
    } finally {
      vi.unstubAllEnvs()
    }

    // 4. Logout clears cookie with Max-Age=0, relative /login Location, and no-store
    const logoutReq = new NextRequest("https://www.chefaugustin.com/api/auth/logout", {
      method: "POST",
      headers: {
        origin: "https://www.chefaugustin.com",
        host: "www.chefaugustin.com",
      },
    })
    const logoutRes = await logoutPOST(logoutReq)
    expect(logoutRes.status).toBe(303)
    expect(logoutRes.headers.get("location")).toBe("/login")
    expect(logoutRes.headers.get("cache-control")).toBe("no-store")
    const clearedCookie = logoutRes.headers.get("set-cookie") ?? ""
    expect(clearedCookie).toContain("dashboard_auth=;")
    expect(clearedCookie).toContain("Max-Age=0")
  })

  it("enforces per-IP rate limiting (429 + Retry-After) without locking out other IPs", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await loginPOST(
        new NextRequest("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-real-ip": "198.51.100.77",
          },
          body: JSON.stringify({ token: "wrong" }),
        }),
      )
      expect(res.status).toBe(401)
    }

    const blocked = await loginPOST(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "198.51.100.77",
        },
        body: JSON.stringify({ token: TEST_SECRET }),
      }),
    )
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0)

    // Another client IP can still authenticate normally
    const otherIpRes = await loginPOST(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "198.51.100.88",
        },
        body: JSON.stringify({ token: TEST_SECRET }),
      }),
    )
    expect(otherIpRes.status).toBe(200)
  })

  it("blocks cross-origin cookie mutations (CSRF) while allowing Bearer API clients", async () => {
    mockCookieToken = TEST_SECRET

    const crossOriginPost = new Request("https://www.chefaugustin.com/api/recipes/generate", {
      method: "POST",
      headers: {
        host: "www.chefaugustin.com",
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
    })
    expect(isSameOriginRequest(crossOriginPost)).toBe(false)
    const csrfRes = await requireDashboardAuth(crossOriginPost)
    expect(csrfRes?.status).toBe(403)

    // Foreign Origin on logout also rejected with 403
    const crossLogout = await logoutPOST(
      new NextRequest("https://www.chefaugustin.com/api/auth/logout", {
        method: "POST",
        headers: {
          host: "www.chefaugustin.com",
          origin: "https://evil.example",
        },
      }),
    )
    expect(crossLogout.status).toBe(403)

    // Spoofed X-Forwarded-Host must NOT bypass same-origin validation
    mockCookieToken = TEST_SECRET
    const spoofedForwardHostPost = new Request("https://www.chefaugustin.com/api/recipes/generate", {
      method: "POST",
      headers: {
        host: "www.chefaugustin.com",
        origin: "https://evil.example",
        "x-forwarded-host": "evil.example",
      },
    })
    expect(isSameOriginRequest(spoofedForwardHostPost)).toBe(false)

    const spoofedLocalOverridePost = new Request("https://www.chefaugustin.com/api/recipes/generate", {
      method: "POST",
      headers: {
        host: "www.chefaugustin.com",
        origin: "http://localhost:3000",
        "x-forwarded-host": "localhost:3000",
      },
    })
    expect(isSameOriginRequest(spoofedLocalOverridePost)).toBe(false)

    // Bearer API call succeeds regardless of Origin
    mockCookieToken = undefined
    const bearerPost = new Request("https://www.chefaugustin.com/api/recipes/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        origin: "https://cli.internal",
      },
    })
    expect(await requireDashboardAuth(bearerPost)).toBeNull()
  })

  it("ignores spoofed x-forwarded-host/proto on redirects and trusts only proxy-appended client IP headers", async () => {
    // 1. Spoofed x-forwarded-host / x-forwarded-proto cannot poison middleware redirect
    const spoofedReq = new NextRequest("http://0.0.0.0:3000/dashboard", {
      headers: {
        host: "0.0.0.0:3000",
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "http",
      },
    })
    const spoofedRes = await middleware(spoofedReq)
    expect(spoofedRes.status).toBe(307)
    expect(spoofedRes.headers.get("location")).toBe("https://www.chefaugustin.com/login")
    expect(spoofedRes.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(spoofedRes.headers.get("cache-control")).toBe("no-store")

    // 2. Internal req.url localhost:3000 never leaks when Host header is production www.chefaugustin.com
    const proxiedReq = new NextRequest("http://localhost:3000/dashboard", {
      headers: {
        host: "www.chefaugustin.com",
        "x-forwarded-host": "evil.example",
      },
    })
    const proxiedRes = await middleware(proxiedReq)
    expect(proxiedRes.status).toBe(307)
    expect(proxiedRes.headers.get("location")).toBe("https://www.chefaugustin.com/login")

    // 3. Direct localhost dev access preserves http://localhost:3000
    const localReq = new NextRequest("http://localhost:3000/dashboard", {
      headers: { host: "localhost:3000" },
    })
    const localRes = await middleware(localReq)
    expect(localRes.status).toBe(307)
    expect(localRes.headers.get("location")).toBe("http://localhost:3000/login")

    // 4. Lookalike non-subdomain host must not trigger canonical redirect
    const lookalikeReq = new NextRequest("https://evilchefaugustin.com/recipes", {
      headers: { host: "evilchefaugustin.com" },
    })
    const lookalikeRes = await middleware(lookalikeReq)
    expect(lookalikeRes.status).toBe(200)

    // 5. /recettes/[slug] 308 redirect ignores spoofed x-forwarded-host/proto
    const legacyReq = new NextRequest("http://localhost:3000/recettes/sample-chicken", {
      headers: {
        host: "www.chefaugustin.com",
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "http",
      },
    })
    const legacyRes = await legacyRecetteGET(legacyReq, {
      params: Promise.resolve({ slug: "sample-chicken" }),
    })
    expect(legacyRes.status).toBe(308)
    expect(legacyRes.headers.get("location")).toBe("https://www.chefaugustin.com/recipes/sample-chicken")

    // 6. getAuthorizedPublicOrigin enforces public origin in production and normalizes apex -> www
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://chefaugustin.com")
    try {
      expect(getAuthorizedPublicOrigin("https://evil.run.app/dashboard", "evil.run.app")).toBe(
        "https://www.chefaugustin.com",
      )
      expect(getAuthorizedPublicOrigin("http://localhost:3000/dashboard", "www.chefaugustin.com")).toBe(
        "https://www.chefaugustin.com",
      )
    } finally {
      vi.unstubAllEnvs()
    }

    // 7. getTrustedClientIp prefers cf-connecting-ip -> x-real-ip -> rightmost x-forwarded-for
    expect(
      getTrustedClientIp(
        new Headers({
          "cf-connecting-ip": "198.51.100.10",
          "x-real-ip": "198.51.100.20",
          "x-forwarded-for": "1.2.3.4, 198.51.100.30",
        }),
      ),
    ).toBe("198.51.100.10")

    expect(
      getTrustedClientIp(
        new Headers({
          "x-real-ip": "198.51.100.20",
          "x-forwarded-for": "1.2.3.4, 198.51.100.30",
        }),
      ),
    ).toBe("198.51.100.20")

    expect(
      getTrustedClientIp(
        new Headers({
          "x-forwarded-for": "1.2.3.4, 198.51.100.30",
        }),
      ),
    ).toBe("unknown")

    // Spoofing varying leftmost X-Forwarded-For values cannot bypass per-IP login rate limit
    for (let i = 0; i < 5; i++) {
      await loginPOST(
        new NextRequest("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": `203.0.113.${i + 100}, 198.51.100.240`,
          },
          body: JSON.stringify({ token: "wrong" }),
        }),
      )
    }
    const spoofBypassAttempt = await loginPOST(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.250, 198.51.100.240",
        },
        body: JSON.stringify({ token: TEST_SECRET }),
      }),
    )
    expect(spoofBypassAttempt.status).toBe(429)
  })
})

describe("Phase 0B Final Security Gate — All 9 Protected Routes & 7 Server Actions (Isolated Mocks)", () => {
  const prevSecret = process.env.DASHBOARD_SECRET_TOKEN

  beforeEach(() => {
    process.env.DASHBOARD_SECRET_TOKEN = TEST_SECRET
    mockCookieToken = undefined
    mockHeadersMap = new Map()
    mockDbState.selectRows = []
    mockDbState.updateReturning = []
    mockDbState.deleteReturning = []
    mockDbState.insertReturning = [{ id: 999 }]
    mockDbState.findFirstResult = null
  })

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.DASHBOARD_SECRET_TOKEN
    else process.env.DASHBOARD_SECRET_TOKEN = prevSecret
  })

  it("protects and runs all 9 private API routes safely under valid auth", async () => {
    const bearerHeader = { Authorization: `Bearer ${TEST_SECRET}` }

    // 1. POST /api/recipes/generate
    expect(
      (await generatePOST(new Request("http://localhost:3000/api/recipes/generate", { method: "POST" }))).status,
    ).toBe(401)
    const genOk = await generatePOST(
      new Request("http://localhost:3000/api/recipes/generate", {
        method: "POST",
        headers: { ...bearerHeader, "content-type": "application/json", "x-forwarded-for": "10.0.0.1" },
        body: JSON.stringify({ keyword: "isolated mock garlic chicken" }),
      }),
    )
    expect(genOk.status).toBe(200)
    expect(await genOk.json()).toEqual({ id: 999, status: "generating" })

    // 2. GET /api/recipes/[id]/status
    expect(
      (
        await statusGET(new Request("http://localhost:3000/api/recipes/10/status"), {
          params: Promise.resolve({ id: "10" }),
        })
      ).status,
    ).toBe(401)
    mockDbState.selectRows = [{ status: "draft_review", workflowLog: ["ok"] }]
    const statusOk = await statusGET(
      new Request("http://localhost:3000/api/recipes/10/status", { headers: bearerHeader }),
      { params: Promise.resolve({ id: "10" }) },
    )
    expect(statusOk.status).toBe(200)
    expect(await statusOk.json()).toEqual({ status: "draft_review", workflowLog: ["ok"] })

    // 3. POST /api/recipes/[id]/approve
    expect(
      (
        await approvePOST(
          new Request("http://localhost:3000/api/recipes/10/approve", { method: "POST" }),
          { params: Promise.resolve({ id: "10" }) },
        )
      ).status,
    ).toBe(401)
    mockDbState.selectRows = [{ status: "draft_review" }]
    const approveOk = await approvePOST(
      new Request("http://localhost:3000/api/recipes/10/approve", {
        method: "POST",
        headers: bearerHeader,
      }),
      { params: Promise.resolve({ id: "10" }) },
    )
    expect(approveOk.status).toBe(200)
    expect(await approveOk.json()).toEqual({ status: "approved" })

    // 4. POST /api/recipes/[id]/cancel
    expect(
      (
        await cancelPOST(
          new Request("http://localhost:3000/api/recipes/10/cancel", { method: "POST" }),
          { params: Promise.resolve({ id: "10" }) },
        )
      ).status,
    ).toBe(401)
    mockDbState.selectRows = [{ status: "generating" }]
    const cancelOk = await cancelPOST(
      new Request("http://localhost:3000/api/recipes/10/cancel", {
        method: "POST",
        headers: bearerHeader,
      }),
      { params: Promise.resolve({ id: "10" }) },
    )
    expect(cancelOk.status).toBe(200)
    expect(await cancelOk.json()).toEqual({ status: "cancelled" })

    // 5. POST /api/internal/regenerate-recipe
    expect(
      (
        await regeneratePOST(
          new Request("http://localhost:3000/api/internal/regenerate-recipe", { method: "POST" }),
        )
      ).status,
    ).toBe(401)
    mockDbState.selectRows = [{ id: 10, slug: "test-slug", keyword: "old" }]
    const regenOk = await regeneratePOST(
      new Request("http://localhost:3000/api/internal/regenerate-recipe", {
        method: "POST",
        headers: { ...bearerHeader, "content-type": "application/json" },
        body: JSON.stringify({ id: 10, keyword: "new" }),
      }),
    )
    expect(regenOk.status).toBe(200)
    expect(await regenOk.json()).toMatchObject({ id: 10, status: "regenerating" })

    // 6. POST /api/internal/backfill-links
    expect(
      (
        await backfillPOST(
          new Request("http://localhost:3000/api/internal/backfill-links", { method: "POST" }),
        )
      ).status,
    ).toBe(401)
    mockDbState.selectRows = [
      { id: 1, slug: "a", title: "A", keyword: "a", tags: [], contentMarkdown: "Hello world" },
      { id: 2, slug: "b", title: "B", keyword: "b", tags: [], contentMarkdown: "Hello world" },
    ]
    const backfillOk = await backfillPOST(
      new Request("http://localhost:3000/api/internal/backfill-links", {
        method: "POST",
        headers: bearerHeader,
      }),
    )
    expect(backfillOk.status).toBe(200)
    expect(await backfillOk.json()).toMatchObject({ totalRecipes: 2 })

    // 7. GET /api/self-improvement/calibration
    expect(
      (await calibrationGET(new Request("http://localhost:3000/api/self-improvement/calibration"))).status,
    ).toBe(401)
    const calOk = await calibrationGET(
      new Request("http://localhost:3000/api/self-improvement/calibration", { headers: bearerHeader }),
    )
    expect(calOk.status).toBe(200)
    expect(await calOk.json()).toMatchObject({ aiScore: { average: 18 } })

    // 8. GET /api/articles/raw
    expect((await articlesRawGET(new Request("http://localhost:3000/api/articles/raw"))).status).toBe(401)
    mockDbState.selectRows = [{ id: 50, slug: "guide-mock" }]
    const artListOk = await articlesRawGET(
      new Request("http://localhost:3000/api/articles/raw", { headers: bearerHeader }),
    )
    expect(artListOk.status).toBe(200)
    expect(await artListOk.json()).toEqual([{ id: 50, slug: "guide-mock" }])

    // 9. GET /api/articles/raw/[slug]
    expect(
      (
        await articleSlugRawGET(new Request("http://localhost:3000/api/articles/raw/guide-mock"), {
          params: Promise.resolve({ slug: "guide-mock" }),
        })
      ).status,
    ).toBe(401)
    const artSlugOk = await articleSlugRawGET(
      new Request("http://localhost:3000/api/articles/raw/guide-mock", { headers: bearerHeader }),
      { params: Promise.resolve({ slug: "guide-mock" }) },
    )
    expect(artSlugOk.status).toBe(200)
    expect(await artSlugOk.json()).toEqual({ id: 50, slug: "guide-mock" })
  })

  it("enforces auth and origin checks on all 7 admin Server Actions", async () => {
    // Unauthenticated
    await expect(publishRecipe(1)).rejects.toThrow("Unauthorized")
    await expect(unpublishRecipe(1)).rejects.toThrow("Unauthorized")
    await expect(deleteRecipe(1)).rejects.toThrow("Unauthorized")
    await expect(approveRecipe(1)).rejects.toThrow("Unauthorized")
    await expect(cancelRecipe(1)).rejects.toThrow("Unauthorized")
    await expect(publishArticle("test-guide")).rejects.toThrow("Unauthorized")
    await expect(deleteArticle("test-guide")).rejects.toThrow("Unauthorized")

    // Cross-origin CSRF with valid cookie
    mockCookieToken = TEST_SECRET
    mockHeadersMap = new Map([
      ["host", "www.chefaugustin.com"],
      ["origin", "https://evil.example"],
    ])
    await expect(publishRecipe(1)).rejects.toThrow("Forbidden")
    await expect(publishArticle("test-guide")).rejects.toThrow("Forbidden")

    // Same-origin valid session executes cleanly with mocked DB
    mockHeadersMap = new Map([
      ["host", "www.chefaugustin.com"],
      ["origin", "https://www.chefaugustin.com"],
    ])
    mockDbState.selectRows = [{ id: 1, title: "Mock", slug: "mock", status: "draft" }]
    mockDbState.updateReturning = [{ slug: "mock", content_type: "recipe", category: "recipes" }]
    mockDbState.deleteReturning = [{ slug: "mock", content_type: "recipe", category: "recipes" }]

    expect(await publishRecipe(1)).toMatchObject({ ok: true })
    await expect(unpublishRecipe(1)).resolves.toBeUndefined()
    await expect(deleteRecipe(1)).resolves.toBeUndefined()

    mockDbState.selectRows = [{ status: "draft_review" }]
    await expect(approveRecipe(1)).resolves.toBeUndefined()

    mockDbState.selectRows = [{ status: "generating" }]
    await expect(cancelRecipe(1)).resolves.toBeUndefined()

    await expect(publishArticle("test-guide")).resolves.toBeUndefined()
    await expect(deleteArticle("test-guide")).rejects.toThrow("NEXT_REDIRECT:/dashboard")
  })
})

describe("Phase 0B Neon Pool Optimization — Bounded Pool & Idle Shutdown", () => {
  it("configures bounded Neon pool options cleanly and closes idle pool without hanging", async () => {
    const testPool = new Pool({
      connectionString: "postgres://user:pass@127.0.0.1:59999/db",
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 200,
      allowExitOnIdle: true,
    })
    expect(testPool.options.max).toBe(3)
    expect(testPool.options.idleTimeoutMillis).toBe(10_000)
    expect(testPool.options.allowExitOnIdle).toBe(true)
    await testPool.end()
  })
})
