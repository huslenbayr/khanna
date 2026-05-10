'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Search, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

export default function Header() {
  const { user, avatarUrl } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserOpen(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    minWidth: 200,
    background: 'rgba(10,12,18,0.97)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid var(--border-glass)',
    borderRadius: 14,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    zIndex: 999,
    padding: '0.4rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  }

  const dropItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    padding: '0.6rem 0.75rem',
    borderRadius: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-main)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
    textDecoration: 'none',
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 md:px-6"
      style={{
        height: 'var(--header-h)',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-glass)',
      }}
    >
      {/* Left: KhannaWay dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => { setMenuOpen(prev => !prev); setUserOpen(false) }}
          aria-label="Open menu"
        >
          <span className="site-header-logo" style={{ pointerEvents: 'none' }}>
            <span className="dot" />
            KhannaWay
          </span>
          <ChevronDown
            size={16}
            className="text-[var(--text-muted)]"
            style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {menuOpen && (
          <div style={{ ...dropdownStyle, left: 0 }}>
            <button
              style={dropItemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              onClick={() => { window.dispatchEvent(new CustomEvent('toggle-feed')); setMenuOpen(false) }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
              Social Feed
            </button>
          </div>
        )}
      </div>

      {/* Right: Search + Avatar dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Link
        href="/search"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0.38rem 0.9rem 0.38rem 0.65rem',
          borderRadius: 20,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border-glass)',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          fontSize: '0.82rem',
          transition: 'background 0.15s, border-color 0.15s',
          whiteSpace: 'nowrap',
          minWidth: 160,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--border-glass)' }}
      >
        <Search size={13} />
        <span>Хайх...</span>
      </Link>
      <div className="relative" ref={userRef}>
        {user ? (
          <>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => { setUserOpen(prev => !prev); setMenuOpen(false) }}
              aria-label="User menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="rounded-full object-cover" style={{ width: 30, height: 30, border: '1px solid var(--border-glass)' }} />
              ) : (
                <div className="rounded-full flex items-center justify-center" style={{ width: 30, height: 30, background: 'rgba(74,222,128,0.12)', border: '1px solid var(--border-glass)' }}>
                  <User size={15} className="text-[var(--primary)]" />
                </div>
              )}
              <ChevronDown
                size={14}
                className="text-[var(--text-muted)]"
                style={{ transition: 'transform 0.2s', transform: userOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {userOpen && (
              <div style={{ ...dropdownStyle, right: 0 }}>
                <div style={{ padding: '0.4rem 0.75rem 0.5rem', borderBottom: '1px solid var(--border-glass)', marginBottom: 2 }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</p>
                </div>
                <Link
                  href={`/profile/${user.id}`}
                  style={dropItemStyle}
                  onClick={() => setUserOpen(false)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <User size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  Профайл
                </Link>
                <button
                  style={dropItemStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={handleLogout}
                >
                  <LogOut size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                  <span style={{ color: '#f87171' }}>Гарах</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            <button className="glass-button active" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} /> Нэвтрэх
            </button>
          </Link>
        )}
      </div>
      </div>
    </header>
  )
}
