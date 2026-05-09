'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { CheckCircle2, LogIn, LogOut, Mail, Shield, UserPlus, X } from 'lucide-react'
import useFirebaseUser from '../hooks/useFirebaseUser'
import { firebaseAuth, firebaseConfigured, googleProvider } from '../lib/firebase'

type AuthDrawerProps = {
  open: boolean
  onClose: () => void
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '0.82rem 0.9rem',
  borderRadius: 8,
  border: '1px solid var(--border-glass)',
  background: 'rgba(255, 255, 255, 0.07)',
  color: 'var(--text-main)',
  fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.4rem',
  color: 'var(--text-muted)',
  fontSize: '0.78rem',
}

const AuthDrawer = ({ open, onClose }: AuthDrawerProps) => {
  const { authReady, user } = useFirebaseUser()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!firebaseAuth) {
      setStatus('Firebase config missing. Add the NEXT_PUBLIC_FIREBASE_* values first.')
      return
    }

    setBusy(true)
    setStatus('')

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password)
        setStatus('Account created and signed in.')
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
        setStatus('Signed in.')
      }
      setPassword('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  const signInWithGoogle = async () => {
    if (!firebaseAuth) {
      setStatus('Firebase config missing. Add the NEXT_PUBLIC_FIREBASE_* values first.')
      return
    }

    setBusy(true)
    setStatus('')

    try {
      await signInWithPopup(firebaseAuth, googleProvider)
      setStatus('Signed in with Google.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Google sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    if (!firebaseAuth) return
    setBusy(true)

    try {
      await signOut(firebaseAuth)
      setStatus('Signed out.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sign-out failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      background: 'rgba(2, 6, 23, 0.42)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '5.25rem 1rem 1rem',
    }}>
      <section className="glass-panel" style={{
        width: 'min(420px, 100%)',
        height: 'fit-content',
        maxHeight: 'calc(100vh - 6.25rem)',
        overflowY: 'auto',
        padding: '1.1rem',
        borderRadius: 8,
        display: 'grid',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700 }}>
              <Shield size={15} /> Firebase Auth
            </div>
            <h2 style={{ fontSize: '1.35rem' }}>{user ? 'Account' : isRegister ? 'Create account' : 'Sign in'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
              Use one account for city videos, moderation notes, and operator actions.
            </p>
          </div>
          <button className="glass-button" onClick={onClose} aria-label="Close login" style={{ padding: '0.55rem' }}>
            <X size={17} />
          </button>
        </div>

        {!firebaseConfigured && (
          <div style={{
            border: '1px solid rgba(244, 63, 94, 0.32)',
            background: 'rgba(244, 63, 94, 0.1)',
            borderRadius: 8,
            padding: '0.75rem',
            color: '#fecdd3',
            fontSize: '0.8rem',
            lineHeight: 1.45,
          }}>
            Firebase is not configured yet. Add your public Firebase web config in `.env.local` to enable sign-in and video publishing.
          </div>
        )}

        {authReady && user ? (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              padding: '0.85rem',
              border: '1px solid var(--border-glass)',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
            }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(74, 222, 128, 0.15)',
                color: 'var(--primary)',
              }}>
                <CheckCircle2 size={21} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.displayName || user.email || 'Signed-in operator'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{user.email}</div>
              </div>
            </div>

            <button className="glass-button" onClick={handleSignOut} disabled={busy} style={{ justifyContent: 'center' }}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={submitAuth} style={{ display: 'grid', gap: '0.85rem' }}>
            <label style={labelStyle}>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operator@khannaway.mn"
                type="email"
                autoComplete="email"
                style={fieldStyle}
              />
            </label>
            <label style={labelStyle}>
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8+ characters"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                style={fieldStyle}
              />
            </label>

            <button className="glass-button active" type="submit" disabled={busy || !firebaseAuth} style={{ justifyContent: 'center' }}>
              {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
              {busy ? 'Working...' : isRegister ? 'Create account' : 'Sign in'}
            </button>

            <button className="glass-button" type="button" onClick={signInWithGoogle} disabled={busy || !firebaseAuth} style={{ justifyContent: 'center' }}>
              <Mail size={16} /> Continue with Google
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegister(current => !current)
                setStatus('')
              }}
              style={{
                border: 0,
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '0.35rem',
              }}
            >
              {isRegister ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
          </form>
        )}

        {status && (
          <div style={{ color: status.includes('failed') || status.includes('missing') || status.includes('Firebase') ? '#fecdd3' : 'var(--primary)', fontSize: '0.8rem', lineHeight: 1.45 }}>
            {status}
          </div>
        )}
      </section>
    </div>
  )
}

export default AuthDrawer
