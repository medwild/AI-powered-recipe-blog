import { NextResponse, type NextRequest } from "next/server"

/**
 * Canonical host redirect — serves the site from www.chefaugustin.com only.
 * Replaces the Vercel platform-level apex→www redirect (not available on
 * Hostinger Node.js hosting). Only applies to chefaugustin.com hosts, so
 * vercel.app preview URLs are unaffected.
 */
const CANONICAL_HOST = "www.chefaugustin.com"

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  if (host !== CANONICAL_HOST && host.endsWith("chefaugustin.com")) {
    const url = new URL(req.url)
    url.host = CANONICAL_HOST
    return NextResponse.redirect(url, 301)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
