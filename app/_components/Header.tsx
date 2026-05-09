'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Search, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

export default function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, avatarUrl } = useAuth()

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
        <button
          className="glass-button"
          style={{ padding: '0.5rem 0.6rem' }}
          onClick={() => router.push('/search')}
          aria-label="Хайх"
        >
          <Search size={15} />
        </button>
        {user ? (
          <>
            <Link
              href={`/profile/${user.id}`}
              className="flex items-center gap-1.5 no-underline text-[0.8rem] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: 24, height: 24 }} />
              ) : (
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 24, height: 24, background: 'rgba(74,222,128,0.12)', border: '1px solid var(--border-glass)' }}>
                  <User size={13} className="text-[var(--primary)]" />
                </div>
              )}
              <span className="header-email">{user.email}</span>
            </Link>
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
