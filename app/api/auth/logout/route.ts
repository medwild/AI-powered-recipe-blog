import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isSameOriginRequest } from "@/lib/auth"

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin request rejected." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    )
  }

  const res = new NextResponse(null, {
    status: 303,
    headers: {
      Location: "/login",
      "Cache-Control": "no-store",
    },
  })
  res.cookies.set("dashboard_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  })
  return res
}
