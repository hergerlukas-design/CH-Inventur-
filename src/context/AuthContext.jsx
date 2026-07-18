import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Profil (Name, Rolle) laden sobald eingeloggt
  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    let active = true
    supabase
      .from('nutzer')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (active) setProfile(data)
      })
    return () => {
      active = false
    }
  }, [session])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.rolle === 'Admin',
    loading,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  return ctx
}
