'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from 'lucide-react'

type HeaderProps = {
  onOpenAuth: () => void
}

const Header = ({ onOpenAuth }: HeaderProps) => {
  const pathname = usePathname()

  // If on dashboard route, offset header so it doesn't overlap sidebar.
  const leftOffset = pathname.startsWith('/dashboard') ? 304 : 16

  return (
    <header style={{ position: 'absolute', top: 16, left: leftOffset, right: 16, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="glass-button" style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', background: pathname === '/' ? 'var(--bg-panel-hover)' : undefined }}>Нүүр</button>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="glass-button" style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}>Хяналт</button>
          </Link>
          <Link href="/naadam" style={{ textDecoration: 'none' }}>
            <button className="glass-button" style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', background: pathname === '/naadam' ? 'var(--bg-panel-hover)' : undefined }}>Наадам</button>
          </Link>
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <button className="glass-button" style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}>Админ</button>
          </Link>
        </nav>
      </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="glass-button" onClick={onOpenAuth} aria-label="Нэвтрэх">
          <User size={16} /> Нэвтрэх / Бүртгүүлэх
        </button>
      </div>
    </header>
  )
}

export default Header
