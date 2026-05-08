'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Header from './Header'
import AuthDrawer from './AuthDrawer'

type SiteShellProps = {
  children: ReactNode
}

const SiteShell = ({ children }: SiteShellProps) => {
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <>
      <Header onOpenAuth={() => setAuthOpen(true)} />
      <AuthDrawer open={authOpen} onClose={() => setAuthOpen(false)} />
      {children}
    </>
  )
}

export default SiteShell
