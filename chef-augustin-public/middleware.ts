import { NextResponse, type NextRequest } from "next/server"

const CANONICAL_HOST = "www.chefaugustin.com"

/**
 * Public-only middleware:
 * - Enforces canonical apex -> www.chefaugustin.com 301 redirect
 * - Sets X-Robots-Tag: noindex, follow on filtered /recipes?cat=... or ?q=... views
 * - Contains zero dashboard, login, or secret dependencies
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase()
  if (host !== CANONICAL_HOST && (host === "chefaugustin.com" || host.endsWith(".chefaugustin.com"))) {
    const target = new URL(
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
      `https://${CANONICAL_HOST}`,
    )
    return NextResponse.redirect(target, 301)
  }

  const pathname = req.nextUrl.pathname
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
