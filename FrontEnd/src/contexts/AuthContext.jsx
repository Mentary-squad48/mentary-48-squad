import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

function friendly(message = '') {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (message.includes('Email not confirmed')) return 'Confirme o e-mail da conta antes de entrar.'
  return message || 'Não foi possível entrar.'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = ainda carregando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  async function login(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw new Error(friendly(error.message))
  }

  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading: session === undefined, isAuthenticated: !!session, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)