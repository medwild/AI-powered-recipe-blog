import { NextResponse, type NextRequest } from "next/server"
import { getAuthorizedPublicOrigin, verifyDashboardToken } from "@/lib/auth"

/**
 * Canonical host redirect — serves the site from www.chefaugustin.com only.
 * Replaces the Vercel platform-level apex→www redirect (not available on
 * Hostinger Node.js hosting). Only applies to chefaugustin.com hosts, so
 * vercel.app preview URLs are unaffected.
 */
const CANONICAL_HOST = "www.chefaugustin.com"

export async function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase()
  if (host !== CANONICAL_HOST && (host === "chefaugustin.com" || host.endsWith(".chefaugustin.com"))) {
    // Rebuild the target explicitly — Hostinger Node hosting runs the app on
    // $PORT behind a proxy, so req.url can carry a stray port that would leak
    // into the Location header (https://www.chefaugustin.com:3000/).
    const target = new URL(
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
      `https://${CANONICAL_HOST}`,
    )
    return NextResponse.redirect(target, 301)
  }

  const pathname = req.nextUrl.pathname

  // Admin studio guard: enforce HTTP 307 redirect + X-Robots-Tag noindex without hitting SSR/DB
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const token = req.cookies.get("dashboard_auth")?.value
    const valid = await verifyDashboardToken(token)
    if (!valid) {
      const loginOrigin = getAuthorizedPublicOrigin(
        req.url,
        req.headers.get("host"),
        req.headers.get("x-forwarded-host"),
      )
      const loginUrl = new URL("/login", loginOrigin)
      const res = NextResponse.redirect(loginUrl, 307)
      res.headers.set("X-Robots-Tag", "noindex, nofollow")
      res.headers.set("Cache-Control", "no-store")
      return res
    }
    const res = NextResponse.next()
    res.headers.set("X-Robots-Tag", "noindex, nofollow")
    res.headers.set("Cache-Control", "no-store")
    return res
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    const res = NextResponse.next()
    res.headers.set("X-Robots-Tag", "noindex, nofollow")
    return res
  }

  // Filtres UI ?cat=/?q= sur /recipes — noindex via header (GSC 09/08, bcd9709).
  // Le HTML est statique (ISR) donc le meta robots ne peut pas dépendre des
  // params ; X-Robots-Tag est honoré par Google. Canonical /recipes reste dans
  // le HTML (metadata statique).
  if (pathname === "/recipes" && req.nextUrl.search !== "") {
    const res = NextResponse.next()
    res.headers.set("X-Robots-Tag", "noindex, follow")
    return res
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
