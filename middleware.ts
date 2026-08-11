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
  // Filtres UI ?cat=/?q= sur /recipes — noindex via header (GSC 09/08, bcd9709).
  // Le HTML est statique (ISR) donc le meta robots ne peut pas dépendre des
  // params ; X-Robots-Tag est honoré par Google. Canonical /recipes reste dans
  // le HTML (metadata statique).
  if (req.nextUrl.pathname === "/recipes" && req.nextUrl.search !== "") {
    const res = NextResponse.next()
    res.headers.set("X-Robots-Tag", "noindex, follow")
    return res
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
