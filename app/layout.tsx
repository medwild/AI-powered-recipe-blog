import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { CookieBanner } from '@/components/cookie-banner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' })
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Chef Augustin — Easy Weeknight Dinners for Two',
    template: '%s | Chef Augustin',
  },
  description:
    'Simple small-batch dinner recipes for two people. Chef Augustin Lefevre shares practical weeknight meals with clear serving sizes and Pinterest-friendly inspiration.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://chefaugustin.com',
  ),
  // Google Search Console — set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in .env.local
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  // Google AdSense — set NEXT_PUBLIC_ADSENSE_PUBLISHER_ID in .env.local
  other: process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
    ? { 'google-adsense-account': process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID }
    : undefined,
  openGraph: {
    type: 'website',
    siteName: 'Chef Augustin',
    title: 'Chef Augustin — Easy Weeknight Dinners for Two',
    description:
      'Simple small-batch dinner recipes for two people. Practical weeknight meals from a French-trained chef.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chef Augustin — Easy Weeknight Dinners for Two',
    description:
      'Simple small-batch dinner recipes for two people.',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#c2683f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${playfair.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {/* Skip to content — WCAG 2.1 AA (bypass blocks) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none"
        >
          Skip to content
        </a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <Toaster position="top-center" richColors />
          <CookieBanner />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
