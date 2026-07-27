import type { Metadata, Viewport } from 'next'
import { Geist, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { CookieBanner } from '@/components/cookie-banner'
import { DynamicToaster } from '@/components/dynamic-toaster'
import { DynamicAnalytics } from '@/components/dynamic-analytics'
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
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.chefaugustin.com',
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
    url: '/',
    images: [
      {
        url: '/hero-kitchen.png',
        width: 1200,
        height: 630,
        alt: 'Chef Augustin — Easy Weeknight Dinners for Two',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chef Augustin — Easy Weeknight Dinners for Two',
    description:
      'Simple small-batch dinner recipes for two people.',
    images: ['/hero-kitchen.png'],
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
      <head>
        {/* Pinterest domain verification */}
        <meta name="p:domain_verify" content="c587a32b74cfe3cf4891ca6ddd5a347b" />
        {/* Prevent white flash on slow connections: set bg before CSS loads */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html{background:#fdfaf4;color:#3d3328}@media(prefers-color-scheme:dark){html{background:#1a1614;color:#f5efe6}}`,
          }}
        />
      </head>
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
          <DynamicToaster />
          <CookieBanner />
          {process.env.NODE_ENV === 'production' && <DynamicAnalytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
