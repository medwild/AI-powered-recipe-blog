import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

const SHARED_ALLOW = ["/", "/api/recipes/raw"]
const SHARED_DISALLOW = ["/dashboard", "/login", "/api/"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: SHARED_ALLOW,
        disallow: SHARED_DISALLOW,
      },
      { userAgent: "OAI-SearchBot", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "PerplexityBot", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "Bingbot", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
      { userAgent: "Googlebot", allow: SHARED_ALLOW, disallow: SHARED_DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}