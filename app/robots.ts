import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api/recipes/raw is referenced by llms.txt for AI crawlers — allow it
        // explicitly despite the /api/ disallow (the raw JSON export is public).
        allow: ["/", "/api/recipes/raw"],
        disallow: ["/dashboard", "/api/"],
      },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}