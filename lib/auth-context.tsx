'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type AuthCtx = { user: User | null }

const Ctx = createContext<AuthCtx>({ user: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, sess) => {
      setUser(sess?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ user }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
