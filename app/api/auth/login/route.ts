import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { getTrustedClientIp, isSameOriginRequest, verifyDashboardToken } from "@/lib/auth"

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST /api/auth/login." },
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
      },
    },
  )
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin request rejected." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    )
  }

  const clientIp = getTrustedClientIp(req.headers)

  const rateLimit = checkRateLimit(`login:${clientIp}`, {
    maxRequests: 5,
    windowMs: 60_000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in a minute." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.resetInSeconds),
          "X-RateLimit-Remaining": "0",
        },
      },
    )
  }

  const contentType = req.headers.get("content-type") ?? ""
  const isFormSubmit =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")

  const redirectTo = (path: string) =>
    new NextResponse(null, {
      status: 303,
      headers: {
        Location: path,
        "Cache-Control": "no-store",
      },
    })

  let token: string
  try {
    if (isFormSubmit) {
      const formData = await req.formData()
      token = String(formData.get("token") ?? "").trim()
    } else {
      const body = await req.json()
      token = (body?.token ?? "").toString().trim()
    }
  } catch {
    if (isFormSubmit) {
      return redirectTo("/login?error=invalid")
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!token) {
    if (isFormSubmit) {
      return redirectTo("/login?error=invalid")
    }
    return NextResponse.json({ error: "Token is required." }, { status: 400 })
  }

  if (!process.env.DASHBOARD_SECRET_TOKEN) {
    console.error("[LOGIN] DASHBOARD_SECRET_TOKEN not set")
    if (isFormSubmit) {
      return redirectTo("/login?error=config")
    }
    return NextResponse.json({ error: "Server not configured." }, { status: 500 })
  }

  const valid = await verifyDashboardToken(token)
  if (!valid) {
    if (isFormSubmit) {
      return redirectTo("/login?error=invalid")
    }
    return NextResponse.json(
      { error: "Invalid token." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    )
  }

  const res = isFormSubmit
    ? redirectTo("/dashboard")
    : NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })

  res.cookies.set("dashboard_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  return res
}
