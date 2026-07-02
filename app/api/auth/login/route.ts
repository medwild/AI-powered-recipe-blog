import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

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
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  })

  return res
}
