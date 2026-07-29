import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { authApi, TOKEN_KEY } from '../lib/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false)
      return
    }
    try {
      setUser(await authApi.me())
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { hydrate() }, [hydrate])

  const login = async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password)
    localStorage.setItem(TOKEN_KEY, token)
    setUser(user)
  }

  const signup = async (email: string, password: string) => {
    const { token, user } = await authApi.signup(email, password)
    localStorage.setItem(TOKEN_KEY, token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      setUser(await authApi.me())
    } catch {
      // token may have expired between actions — the response interceptor
      // in api.ts already handles redirecting to /login on a real 401
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
