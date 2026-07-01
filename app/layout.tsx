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
    default: 'The Gourmet Notebook — French Cooking Recipes',
    template: '%s | The Gourmet Notebook',
  },
  description:
    'Generous, easy-to-make recipes, optimized and tested to succeed every time.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://lecarnetgourmand.fr',
  ),
  openGraph: {
    type: 'website',
    siteName: 'The Gourmet Notebook',
    title: 'The Gourmet Notebook — French Cooking Recipes',
    description:
      'Generous, easy-to-make recipes, optimized and tested to succeed every time.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Gourmet Notebook — French Cooking Recipes',
    description:
      'Generous, easy-to-make recipes, optimized and tested to succeed every time.',
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
      lang="fr"
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
