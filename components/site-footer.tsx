import Link from "next/link"
import { InstagramIcon, PinterestIcon, YouTubeIcon } from "@/components/ui/social-icons"

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:text-primary hover:border-primary/40"
    >
      {children}
    </a>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <p className="font-serif text-lg text-foreground">Chef Augustin</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Small-batch dinner recipes for two, grounded in French technique and
              real-world kitchen experience.
            </p>
            <a
              href="mailto:hello@chefaugustin.com"
              className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              hello@chefaugustin.com
            </a>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Explore
            </p>
            <Link href="/recipes" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              All Recipes
            </Link>
            <Link href="/techniques" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Techniques
            </Link>
            <Link href="/guides" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Guides
            </Link>
            <Link href="/histoire" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              History
            </Link>
            <Link href="/equipement" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Equipment
            </Link>
            <Link href="/idees" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Ideas
            </Link>
            <Link href="/about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              About
            </Link>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </p>
            <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms &amp; Disclaimer
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Contact
            </Link>
          </div>

          {/* Connect */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connect
            </p>
            <div className="flex items-center gap-2">
              <SocialIcon href="https://www.instagram.com/chefaugustin" label="Instagram">
                <InstagramIcon className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon href="https://www.pinterest.com/chefaugustin" label="Pinterest">
                <PinterestIcon className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon href="https://www.youtube.com/@chefaugustin" label="YouTube">
                <YouTubeIcon className="h-4 w-4" />
              </SocialIcon>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Regularly updated · Human-tested &amp; verified ·{" "}
              {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
