'use client'

import type { ChangeEvent } from 'react'
import { useState } from 'react'

type AuthDrawerProps = {
  open: boolean
  onClose: () => void
}

const AuthDrawer = ({ open, onClose }: AuthDrawerProps) => {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const updateEmail = (event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)
  const updatePassword = (event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)

  if (!open) return null

  return (
    <div style={{ position: 'absolute', right: 16, top: 72, zIndex: 40 }}>
      <div className="glass-panel" style={{ width: 340, padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{isRegister ? 'Бүртгүүлэх' : 'Нэвтрэх'}</h3>
          <button className="glass-button" onClick={onClose}>Хаах</button>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input value={email} onChange={updateEmail} placeholder="Имэйл" style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-main)' }} />
          <input value={password} onChange={updatePassword} placeholder="Нууц үг" type="password" style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-main)' }} />
          <button className="glass-button" onClick={() => alert((isRegister ? 'Бүртгүүлж байна: ' : 'Нэвтэрч байна: ') + email)}> {isRegister ? 'Бүртгүүлэх' : 'Нэвтрэх'} </button>
          <button className="glass-button" onClick={() => setIsRegister(!isRegister)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>{isRegister ? 'Бүртгэлтэй юу? Нэвтрэх' : 'Бүртгэлгүй юу? Бүртгүүлэх'}</button>
        </div>
      </div>
    </div>
  )
}

export default AuthDrawer
