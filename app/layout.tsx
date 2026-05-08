import 'maplibre-gl/dist/maplibre-gl.css'
import './globals.css'
import type { ReactNode } from 'react'
import SiteShell from '@/components/SiteShell'

import type { Viewport } from 'next'

export const metadata = {
  title: 'KhannaWay',
  description: 'Naadam visitor guide and live event command center',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="mn">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  )
}
