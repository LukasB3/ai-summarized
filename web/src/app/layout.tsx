import './globals.css'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'
import { Masthead } from '@/components/Masthead'
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: `${SITE_NAME}: the day in AI, ranked`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_GB' },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e9f1fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1524' },
  ],
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Masthead />
        {children}
        <Footer />
      </body>
    </html>
  )
}
