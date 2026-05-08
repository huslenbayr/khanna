import 'maplibre-gl/dist/maplibre-gl.css'
import '../src/index.css'
import type { ReactNode } from 'react'
import SiteShell from '../src/components/SiteShell'

export const metadata = {
  title: 'KhannaWay',
  description: 'Naadam visitor guide and live event command center'
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
