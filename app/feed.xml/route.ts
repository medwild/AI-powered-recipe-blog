import { getPublishedRecipes } from "@/lib/queries"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chefaugustin.com"

export async function GET() {
  const recipes = await getPublishedRecipes()

  const itemsXml = recipes
    .map(
      (recipe) => `
    <item>
      <title><![CDATA[${recipe.title}]]></title>
      <link>${BASE_URL}/recettes/${recipe.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/recettes/${recipe.slug}</guid>
      <description><![CDATA[${recipe.excerpt || ""}]]></description>
      ${recipe.heroImageUrl ? `<enclosure url="${recipe.heroImageUrl}" type="image/jpeg" />` : ""}
      <pubDate>${new Date(recipe.createdAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Chef Augustin -- The Sourdough Kitchen</title>
    <link>${BASE_URL}</link>
    <description>Tested sourdough bread recipes for home bakers by Chef Augustin Lefevre. From starter to discard, from crust to crumb.</description>
    <language>en</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}