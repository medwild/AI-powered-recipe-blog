export function HomepageJsonLd() {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Chef Augustin",
            url: SITE,
            logo: `${SITE}/hero-kitchen.png`,
            description:
              "Chef Augustin Lefevre shares practical small-batch dinner recipes for two.",
            sameAs: [
              "https://www.instagram.com/chefaugustin",
              "https://www.pinterest.com/chefaugustin",
              "https://www.youtube.com/@chefaugustin",
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Chef Augustin",
            url: SITE,
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE}/recipes?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
        ]),
      }}
    />
  )
}
