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
    // Rebuild the target explicitly — Hostinger Node hosting runs the app on
    // $PORT behind a proxy, so req.url can carry a stray port that would leak
    // into the Location header (https://www.chefaugustin.com:3000/).
    const target = new URL(
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
      `https://${CANONICAL_HOST}`,
    )
    return NextResponse.redirect(target, 301)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
