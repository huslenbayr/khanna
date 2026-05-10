'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.4 5.6-5 7.3v6h8c4.8-4.4 7.3-10.9 7.3-17.5z" fill="#4285F4"/>
      <path d="M24 48c6.5 0 12-2.1 15.9-5.8l-8-6c-2.1 1.4-4.8 2.2-7.9 2.2-6 0-11.1-4-13-9.5H2.7v6.2C6.6 42.6 14.8 48 24 48z" fill="#34A853"/>
      <path d="M11 28.9c-.5-1.4-.7-2.9-.7-4.4s.2-3 .7-4.4v-6.2H2.7A23.9 23.9 0 0 0 0 24c0 3.9.9 7.6 2.7 10.9l8.3-6z" fill="#FBBC05"/>
      <path d="M24 9.5c3.4 0 6.5 1.2 8.9 3.4l6.6-6.6C35.9 2.4 30.4 0 24 0 14.8 0 6.6 5.4 2.7 13.1l8.3 6.2c1.9-5.5 7-9.8 13-9.8z" fill="#EA4335"/>
    </svg>
  )
}

export default function AuthPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGL]  = useState(false)
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  const handleGoogleSignIn = async () => {
    setGL(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

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

        {/* Google OAuth */}
        <button
          className="glass-button w-full justify-center mb-4"
          style={{ gap: '0.6rem', minHeight: 44 }}
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <GoogleIcon />
          Google-ээр {isRegister ? 'бүртгүүлэх' : 'нэвтрэх'}
        </button>

        <div className="auth-divider">
          <span>эсвэл имэйлээр</span>
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
