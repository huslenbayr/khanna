'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, User, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

export default function Header() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(true)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <header style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 40, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>KhannaWay</div>
            </Link>
          </div>
        </div>

        <button className="glass-button active hidden md:flex" onClick={() => setCollapsed(!collapsed)} style={{ alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0 }} aria-expanded={!collapsed} aria-label="Toggle menu">
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        {/* 
          Using Tailwind classes exclusively for display to avoid inline-style specificity issues.
          - 'hidden': Always hidden on mobile.
          - 'md:flex' / 'md:hidden': Toggle visibility based on state for desktop only.
        */}
        <nav 
          className={`hidden md:${collapsed ? 'hidden' : 'flex'}`}
          style={{ 
            flexWrap: 'wrap', 
            gap: 8, 
            alignItems: 'center' 
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="glass-button active">
              Нүүр
            </button>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button 
              className={`glass-button ${pathname.startsWith('/dashboard') ? 'active' : ''}`}
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-feed'))}
            >
              Social Feed
            </button>
          </Link>

          <button className="glass-button active" onClick={() => window.dispatchEvent(new CustomEvent('toggle-city'))}>
            Хотын мэдээлэл
          </button>

          {user ? (
            <>
              <span className="flex items-center gap-1 text-[0.8rem] text-[var(--text-muted)]" style={{ marginLeft: 8 }}>
                <User size={13} />
                <span className="header-email">{user.email}</span>
              </span>
              <button className="glass-button" onClick={handleLogout}>
                <LogOut size={14} />
                Гарах
              </button>
            </>
          ) : (
            <Link href="/auth" style={{ textDecoration: 'none' }}>
              <button className="glass-button active">
                <User size={14} /> Нэвтрэх
              </button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
