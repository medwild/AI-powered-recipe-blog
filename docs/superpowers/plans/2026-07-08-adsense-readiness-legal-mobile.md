# AdSense Readiness — Legal Pages + Mobile Header — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 3 legal pages, a cookie consent banner, update the footer with legal links, and add a hamburger menu to the header for mobile responsiveness — all frontend-only, zero backend changes.

**Architecture:** 3 new static pages under `app/` (Privacy, Terms, Contact), 1 client component (CookieBanner), 1 modified client component (SiteHeader with hamburger), 1 modified server component (SiteFooter with legal links), 1 layout update to render CookieBanner.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS 4, lucide-react icons

## Global Constraints

- No new dependencies
- No backend, API, or database changes
- No SEO metadata or JSON-LD changes on existing pages
- All pages use existing patterns: `SiteHeader` + `SiteFooter` + `max-w-3xl` container
- `npx tsc --noEmit` must pass after every task
- `npm run build` must pass at final verification
- Follow existing Tailwind class conventions (rounded-2xl, border-border, text-muted-foreground, etc.)

---

### Task 1: Privacy Policy page (`/privacy`)

**Files:**
- Create: `app/privacy/page.tsx`

**Interfaces:**
- Produces: `<PrivacyPage />` — accessible at `/privacy`

- [ ] **Step 1: Create the Privacy Policy page**

Create `app/privacy/page.tsx`:

```tsx
import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Breadcrumbs } from "@/components/breadcrumbs"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Chef Augustin collects and uses your data.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Privacy Policy", href: "/privacy" },
          ]}
        />
        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-serif text-3xl text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: July 8, 2026
          </p>

          <div className="mt-8 prose prose-neutral max-w-none text-foreground leading-relaxed space-y-6">
            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">1. Information We Collect</h2>
              <p>
                Chef Augustin (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the website
                chefaugustin.com (the &ldquo;Site&rdquo;). We collect minimal information to provide and
                improve our service.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Usage Data:</strong> Pages visited, time spent, referring URLs, browser type. Collected automatically via Google Analytics.</li>
                <li><strong>Cookies:</strong> Small data files stored on your device. See Section 3.</li>
                <li><strong>Contact Information:</strong> If you email us, we receive your email address and any information you choose to share.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">2. How We Use Your Information</h2>
              <p>We use the collected information to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Analyze site traffic and improve content</li>
                <li>Display relevant advertisements via Google AdSense</li>
                <li>Respond to your inquiries</li>
                <li>Maintain site security</li>
              </ul>
              <p className="mt-3">We do not sell, rent, or share your personal information with third parties except as described in this policy.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">3. Cookies</h2>
              <p>We use cookies for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Essential Cookies:</strong> Required for site functionality (theme preference, cookie consent).</li>
                <li><strong>Analytics Cookies:</strong> Google Analytics helps us understand how visitors use the site.</li>
                <li><strong>Advertising Cookies:</strong> Google AdSense may use cookies to show personalized ads based on your browsing history.</li>
              </ul>
              <p className="mt-3">
                You can disable cookies in your browser settings. Please note that disabling cookies may affect site functionality.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">4. Third-Party Services</h2>
              <p>We use the following third-party services that may collect data:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Google AdSense:</strong> Displays advertisements. Google uses cookies to serve ads based on your prior visits to our site and other sites. You can opt out of personalized advertising by visiting{" "}
                  <a href="https://adssettings.google.com" className="text-primary underline hover:text-primary/80">Google Ads Settings</a>.
                </li>
                <li><strong>Google Analytics:</strong> Tracks site usage. Data is anonymized where possible.</li>
                <li><strong>Cloudinary:</strong> Hosts our images. May collect technical data for content delivery.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">5. Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Access the personal data we hold about you</li>
                <li>Request correction or deletion of your data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="mt-3">To exercise these rights, contact us at the email listed on our Contact page.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">6. Data Retention</h2>
              <p>
                We retain usage data for as long as necessary to fulfill the purposes outlined in this policy.
                Cookie data is retained according to each cookie&apos;s expiration period.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">7. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page
                with an updated &ldquo;Last updated&rdquo; date.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">8. Contact</h2>
              <p>
                For questions about this Privacy Policy, please visit our{" "}
                <a href="/contact" className="text-primary underline hover:text-primary/80">Contact page</a>.
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/privacy/page.tsx
git commit -m "feat: add Privacy Policy page (/privacy)"
```

---

### Task 2: Terms & Disclaimer page (`/terms`)

**Files:**
- Create: `app/terms/page.tsx`

**Interfaces:**
- Produces: Accessible at `/terms`

- [ ] **Step 1: Create the Terms page**

Create `app/terms/page.tsx`:

```tsx
import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Breadcrumbs } from "@/components/breadcrumbs"

export const metadata: Metadata = {
  title: "Terms & Disclaimer",
  description: "Terms of use and disclaimer for Chef Augustin recipes.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Terms & Disclaimer", href: "/terms" },
          ]}
        />
        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-serif text-3xl text-foreground">Terms &amp; Disclaimer</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: July 8, 2026
          </p>

          <div className="mt-8 prose prose-neutral max-w-none text-foreground leading-relaxed space-y-6">
            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">1. Informational Purposes Only</h2>
              <p>
                The recipes, techniques, and content on Chef Augustin are provided for informational and
                educational purposes only. They do not constitute professional nutritional, medical, or
                dietary advice.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">2. Recipe Results May Vary</h2>
              <p>
                Cooking results depend on many factors including ingredient quality, equipment, altitude,
                humidity, and individual skill. We cannot guarantee that your results will match the
                descriptions or photos on this site.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">3. Allergen Warning</h2>
              <p>
                Always check ingredient labels for allergens. Our recipes may contain or come into contact
                with common allergens including wheat, dairy, eggs, nuts, soy, and shellfish. If you have
                food allergies, consult the ingredient manufacturer and your healthcare provider.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">4. Nutritional Information</h2>
              <p>
                Any nutritional information provided is an estimate calculated using standard ingredient
                databases. Values may vary based on specific brands, preparation methods, and portion sizes.
                Do not rely on this information for medical or dietary decisions.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">5. AI-Assisted Content</h2>
              <p>
                Some content on this site is generated or assisted by artificial intelligence and reviewed
                by our editorial team. While we strive for accuracy, occasional errors may occur. If you
                spot an error, please let us know via our Contact page.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">6. Affiliate Disclosure</h2>
              <p>
                Chef Augustin may participate in affiliate marketing programs. If you click on an affiliate
                link and make a purchase, we may earn a small commission at no additional cost to you.
                Affiliate links will be clearly identified where present.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">7. Intellectual Property</h2>
              <p>
                All original content, including recipes, photographs, and articles, is protected by copyright.
                You may share links to our content and use our photos with proper attribution and a link back
                to the original recipe page. You may not republish our recipes in full without permission.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">8. Limitation of Liability</h2>
              <p>
                Chef Augustin and its contributors shall not be held liable for any damages, losses, or
                injuries arising from the use of information or recipes provided on this site. Use of this
                site is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-bold mt-8 mb-3">9. Contact</h2>
              <p>
                For questions about these Terms, please visit our{" "}
                <a href="/contact" className="text-primary underline hover:text-primary/80">Contact page</a>.
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/terms/page.tsx
git commit -m "feat: add Terms & Disclaimer page (/terms)"
```

---

### Task 3: Contact page (`/contact`)

**Files:**
- Create: `app/contact/page.tsx`

**Interfaces:**
- Produces: Accessible at `/contact`

- [ ] **Step 1: Create the Contact page**

Create `app/contact/page.tsx`:

```tsx
import type { Metadata } from "next"
import { Mail } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Breadcrumbs } from "@/components/breadcrumbs"

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Chef Augustin — questions, feedback, or recipe requests.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Contact", href: "/contact" },
          ]}
        />
        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="font-serif text-3xl text-foreground">Get in Touch</h1>
          <p className="mt-3 max-w-lg text-muted-foreground leading-relaxed">
            Questions about a recipe? Found an error? Have a suggestion? We&apos;d love to
            hear from you.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-serif text-xl text-foreground">Email</h2>
            </div>
            <a
              href="mailto:hello@chefaugustin.com"
              className="text-lg font-medium text-primary underline hover:text-primary/80"
            >
              hello@chefaugustin.com
            </a>
            <p className="mt-3 text-sm text-muted-foreground">
              We typically respond within 2&ndash;3 business days. Please include the recipe
              name or URL if your message is about a specific recipe.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-serif text-xl text-foreground mb-4">What to Contact Us About</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">✓</span>
                <span>Recipe questions or troubleshooting</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">✓</span>
                <span>Factual errors or typos in recipes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">✓</span>
                <span>Recipe requests or content suggestions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">✓</span>
                <span>Partnership or media inquiries</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-primary">✓</span>
                <span>Privacy or data requests</span>
              </li>
            </ul>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/contact/page.tsx
git commit -m "feat: add Contact page (/contact)"
```

---

### Task 4: Cookie Consent Banner

**Files:**
- Create: `components/cookie-banner.tsx`

**Interfaces:**
- Produces: `<CookieBanner />` — client component, renders at bottom of screen
- Stores consent in `localStorage` key `cookie-consent`
- When accepted, hides and stores `"accepted"` value

- [ ] **Step 1: Create the CookieBanner component**

Create `components/cookie-banner.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent")
    if (!stored) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in-up border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use cookies to analyze traffic and serve personalized ads.{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary underline hover:text-primary/80"
          >
            Learn more
          </Link>
        </p>
        <button
          type="button"
          onClick={accept}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/cookie-banner.tsx
git commit -m "feat: add Cookie Consent banner with localStorage"
```

---

### Task 5: Footer — Legal links

**Files:**
- Modify: `components/site-footer.tsx`

**Interfaces:**
- Consumes: Nothing new
- Produces: Same `<SiteFooter />` API — adds "Legal" column with Privacy, Terms, Contact links

- [ ] **Step 1: Add legal links to the footer**

In `components/site-footer.tsx`, find the "Explore" column (the `flex flex-col gap-2` div after the Brand column) and add a new "Legal" column right after it. The grid should become `sm:grid-cols-4` to accommodate the new column.

Update the grid from `sm:grid-cols-3` to `sm:grid-cols-4`.

After the "Explore" column div, insert:

```tsx
          {/* Legal */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </p>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms &amp; Disclaimer
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </div>
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/site-footer.tsx
git commit -m "feat: footer — add Legal column with Privacy, Terms, Contact links"
```

---

### Task 6: Layout — CookieBanner integration

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `CookieBanner` component
- Produces: CookieBanner rendered in root layout alongside Toaster

- [ ] **Step 1: Add CookieBanner to root layout**

In `app/layout.tsx`, add the import:

```typescript
import { CookieBanner } from "@/components/cookie-banner"
```

Then add `<CookieBanner />` right after the `{children}` line and before `<Toaster>`:

```tsx
          {children}
          <CookieBanner />
          <Toaster position="top-center" richColors />
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: integrate CookieBanner into root layout"
```

---

### Task 7: Mobile Header — Hamburger Menu

**Files:**
- Modify: `components/site-header.tsx`

**Interfaces:**
- Produces: Same `<SiteHeader />` API — identical desktop behavior, new mobile hamburger menu

- [ ] **Step 1: Refactor SiteHeader with hamburger menu**

Replace the entire content of `components/site-header.tsx`:

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChefHat, Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV_LINKS = [
  { href: "/recettes", label: "Recipes" },
  { href: "/techniques", label: "Techniques" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={close}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">
            Chef Augustin
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Studio
          </Link>
          <ThemeToggle />
        </nav>

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open ? (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 top-16 z-30 bg-black/20"
            onClick={close}
            aria-hidden="true"
          />
          {/* Menu */}
          <nav className="md:hidden absolute top-16 left-0 right-0 z-30 border-b border-border bg-background/95 backdrop-blur">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="block px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            <div className="mx-4 my-2 border-t border-border" />
            <Link
              href="/dashboard"
              onClick={close}
              className="block px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Studio
            </Link>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-base font-medium text-foreground">Dark mode</span>
              <ThemeToggle />
            </div>
          </nav>
        </>
      ) : null}
    </header>
  )
}
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/site-header.tsx
git commit -m "feat: mobile hamburger menu — responsive header with slide-down nav"
```

---

### Task 8: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: PASS with zero errors.

- [ ] **Step 2: Full production build**

```bash
npm run build
```

Expected: Build succeeds. Verify new routes appear:
- `/privacy` — static
- `/terms` — static
- `/contact` — static

- [ ] **Step 3: Verify all new pages exist**

```bash
ls -la app/privacy/page.tsx app/terms/page.tsx app/contact/page.tsx components/cookie-banner.tsx
```

Expected: All 4 files exist.

- [ ] **Step 4: Verify no protected files touched**

```bash
git diff --name-only main~7..HEAD | grep -E "^lib/|^app/api/|^middleware"
```

Expected: No output (clean — only frontend files).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final verification — typecheck + build pass, AdSense readiness complete"
```
