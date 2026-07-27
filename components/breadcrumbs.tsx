import Link from "next/link"
import { ChevronRight } from "lucide-react"

type Crumb = { label: string; href: string }

function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chefaugustin.com"
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((crumb, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: crumb.label,
            item: `${SITE}${crumb.href}`,
          })),
        }),
      }}
    />
  )
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-3xl px-4 pt-6"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : null}
                {isLast ? (
                  <span className="font-medium text-foreground" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
      <BreadcrumbJsonLd crumbs={crumbs} />
    </>
  )
}
