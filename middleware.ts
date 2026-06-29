import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_PATHS = ["/dashboard"]
const AUTH_COOKIE = "dashboard_auth"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

  if (!isProtected) return NextResponse.next()

  const cookie = req.cookies.get(AUTH_COOKIE)
  const expectedToken = process.env.DASHBOARD_SECRET_TOKEN

  if (!expectedToken) {
    console.error("[AUTH] DASHBOARD_SECRET_TOKEN non défini")
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (cookie?.value === expectedToken) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/login", req.url))
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
