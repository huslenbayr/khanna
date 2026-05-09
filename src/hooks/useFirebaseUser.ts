'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { firebaseAuth, firebaseConfigured } from '../lib/firebase'

const useFirebaseUser = () => {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!firebaseAuth)

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthReady(true)
      return
    }

    return onAuthStateChanged(firebaseAuth, currentUser => {
      setUser(currentUser)
      setAuthReady(true)
    })
  }, [])

  return {
    authReady,
    firebaseConfigured,
    user,
  }
}

export default useFirebaseUser
