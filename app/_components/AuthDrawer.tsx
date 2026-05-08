'use client'

import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AuthDrawerProps = {
  open: boolean
  onClose: () => void
}

const AuthDrawer = ({ open, onClose }: AuthDrawerProps) => {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (!open) return null

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const supabase = createClient()

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Имэйл хаягаа шалгаад баталгаажуулах холбоос дээр дарна уу.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        onClose()
      }
    }

    setLoading(false)
  }

  const switchMode = () => {
    setIsRegister(!isRegister)
    setError('')
    setMessage('')
  }

  return (
    <div className="glass-panel w-full max-w-[360px] p-4" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center">
        <h3 className="m-0 text-base font-semibold">{isRegister ? 'Бүртгүүлэх' : 'Нэвтрэх'}</h3>
        <button className="glass-button" onClick={onClose}>Хаах</button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="Имэйл"
          type="email"
          required
          className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-glass)] bg-transparent text-[var(--text-main)] text-sm outline-none focus:border-[var(--primary)]"
        />
        <input
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="Нууц үг"
          type="password"
          required
          minLength={6}
          className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-glass)] bg-transparent text-[var(--text-main)] text-sm outline-none focus:border-[var(--primary)]"
        />

        {error && <p className="m-0 text-[#f87171] text-[0.85rem]">{error}</p>}
        {message && <p className="m-0 text-[#4ade80] text-[0.85rem]">{message}</p>}

        <button className="glass-button active justify-center" type="submit" disabled={loading}>
          {loading ? 'Уншиж байна...' : isRegister ? 'Бүртгүүлэх' : 'Нэвтрэх'}
        </button>
        <button
          type="button"
          className="glass-button justify-center bg-transparent! border-none! text-[var(--text-muted)]"
          onClick={switchMode}
        >
          {isRegister ? 'Бүртгэлтэй юу? Нэвтрэх' : 'Бүртгэлгүй юу? Бүртгүүлэх'}
        </button>
      </form>
    </div>
  )
}

export default AuthDrawer
