'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import Header from './Header'

export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Header />
      {children}
    </AuthProvider>
  )
}
