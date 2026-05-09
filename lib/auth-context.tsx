'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type AuthCtx = { user: User | null; avatarUrl: string | null; setAvatarUrl: (url: string | null) => void }

const Ctx = createContext<AuthCtx>({ user: null, avatarUrl: null, setAvatarUrl: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()

    const loadAvatar = async (userId: string) => {
      const { data } = await sb.from('profiles').select('avatar_url').eq('id', userId).single()
      setAvatarUrl(data?.avatar_url ?? null)
    }

    sb.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) void loadAvatar(data.user.id)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_, sess) => {
      setUser(sess?.user ?? null)
      if (sess?.user) void loadAvatar(sess.user.id)
      else setAvatarUrl(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ user, avatarUrl, setAvatarUrl }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
