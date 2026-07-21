import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

function origin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000"
  const proto = req.headers.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit("login", { maxRequests: 5, windowMs: 60_000 })
  const base = origin(req)

  if (!rateLimit.allowed) {
    return NextResponse.redirect(new URL("/login?error=Too+many+attempts", base))
  }

  const token = req.nextUrl.searchParams.get("token") ?? ""

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=Token+required", base))
  }

  const expected = process.env.DASHBOARD_SECRET_TOKEN

  if (!expected) {
    console.error("[LOGIN] DASHBOARD_SECRET_TOKEN not set")
    return NextResponse.redirect(new URL("/login?error=Server+not+configured", base))
  }

  if (token !== expected) {
    console.error(`[LOGIN] Token mismatch. Received: ${token.length} chars, Expected: ${expected.length} chars`)
    return NextResponse.redirect(new URL("/login?error=Invalid+token", base))
  }

  const url = new URL("/dashboard", base)
  const res = NextResponse.redirect(url)
  res.cookies.set("dashboard_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  return res
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit("login", { maxRequests: 5, windowMs: 60_000 })
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again in a minute." }, { status: 429 })
  }

  let token: string
  try {
    const body = await req.json()
    token = (body?.token ?? "").toString()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: "Token is required." }, { status: 400 })
  }

  const expected = process.env.DASHBOARD_SECRET_TOKEN

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set("dashboard_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  return res
}
