import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <p className="font-serif text-base text-foreground">
          The Gourmet Notebook
        </p>
        <p>
          {"AI-generated and optimized recipes · "}
          {new Date().getFullYear()}
        </p>
        <Link href="/dashboard" className="transition-colors hover:text-foreground">
          Editorial Studio
        </Link>
      </div>
    </footer>
  )
}
