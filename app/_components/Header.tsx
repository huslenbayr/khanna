'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

export default function Header() {
  const pathname = usePathname()
  const { user } = useAuth()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <header className="site-header">
      <Link href="/" className="site-header-logo">
        <span className="dot" />
        KhannaWay
      </Link>

      <nav className="header-nav">
        <Link href="/" className="no-underline">
          <button
            className="glass-button"
            style={{ background: pathname === '/' ? 'var(--bg-panel-hover)' : undefined }}
          >
            Нүүр
          </button>
        </Link>
        <Link href="/dashboard" className="no-underline">
          <button
            className="glass-button"
            style={{ background: pathname.startsWith('/dashboard') ? 'var(--bg-panel-hover)' : undefined }}
          >
            Газрын зураг
          </button>
        </Link>
      </nav>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <span className="flex items-center gap-1 text-[0.8rem] text-[var(--text-muted)]">
              <User size={13} />
              <span className="header-email">{user.email}</span>
            </span>
            <button className="glass-button" onClick={handleLogout} style={{ padding: '0.5rem 0.75rem' }}>
              <LogOut size={14} />
              <span className="header-logout-label">Гарах</span>
            </button>
          </>
        ) : (
          <Link href="/auth" className="glass-button no-underline" style={{ padding: '0.5rem 0.85rem' }}>
            <User size={15} />
            <span>Нэвтрэх</span>
          </Link>
        )}
      </div>
    </header>
  )
}
