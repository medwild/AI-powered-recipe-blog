import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
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
