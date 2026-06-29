import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function POST(_req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", _req.url))
  res.cookies.delete("dashboard_auth")
  return res
}
