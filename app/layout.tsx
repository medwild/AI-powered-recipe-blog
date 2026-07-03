import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' })
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Chef Augustin — The Sourdough Kitchen',
    template: '%s | Chef Augustin',
  },
  description:
    'Chef Augustin Lefevre brings French sourdough techniques to your kitchen. Tested artisan bread recipes for home bakers — from starter to discard, from crust to crumb.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://chefaugustin.com',
  ),
  openGraph: {
    type: 'website',
    siteName: 'Chef Augustin',
    title: 'Chef Augustin — The Sourdough Kitchen',
    description:
      'Chef Augustin Lefevre brings French sourdough techniques to your kitchen. Tested artisan bread recipes for home bakers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chef Augustin — The Sourdough Kitchen',
    description:
      'Chef Augustin Lefevre brings French sourdough techniques to your kitchen.',
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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster position="top-center" richColors />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
