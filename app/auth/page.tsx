'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

export default function AuthPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const supabase = createClient()

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim(), phone: phone.trim() || null } },
      })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        // Immediate sign-in (no email confirmation) — also upsert profile directly
        await supabase.from('profiles').upsert(
          { id: data.user!.id, name: name.trim(), phone: phone.trim() || null },
          { onConflict: 'id' },
        )
        router.replace('/dashboard')
      } else {
        setMessage('Имэйл хаягаа шалгаад баталгаажуулах холбоос дээр дарна уу.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.replace('/dashboard')
    }

    setLoading(false)
  }

  const switchMode = () => {
    setIsRegister(v => !v)
    setError('')
    setMessage('')
  }

  return (
    <div className="auth-page">
      <div className="auth-card glass-panel">
        <div className="auth-card-header">
          <Link href="/" className="auth-back">
            <ArrowLeft size={16} />
            Буцах
          </Link>
          <div className="site-header-logo" style={{ justifyContent: 'center', marginBottom: '0.25rem' }}>
            <span className="dot" />
            KhannaWay
          </div>
          <h1 className="auth-title">
            <User size={20} />
            {isRegister ? 'Бүртгүүлэх' : 'Нэвтрэх'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <>
              <input
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Нэр (заавал)"
                type="text"
                autoComplete="name"
                required
                className="auth-input"
              />
              <input
                value={phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                placeholder="Утасны дугаар (заавал биш)"
                type="tel"
                autoComplete="tel"
                className="auth-input"
              />
            </>
          )}
          <input
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="Имэйл хаяг"
            type="email"
            autoComplete="email"
            required
            className="auth-input"
          />
          <input
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Нууц үг"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={6}
            className="auth-input"
          />

          {error   && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button className="glass-button active justify-center w-full" type="submit" disabled={loading}>
            {loading ? 'Түр хүлээнэ үү...' : isRegister ? 'Бүртгүүлэх' : 'Нэвтрэх'}
          </button>
          <button type="button" className="auth-switch" onClick={switchMode}>
            {isRegister ? 'Бүртгэлтэй юу? Нэвтрэх' : 'Бүртгэлгүй юу? Бүртгүүлэх'}
          </button>
        </form>
      </div>
    </div>
  )
}
