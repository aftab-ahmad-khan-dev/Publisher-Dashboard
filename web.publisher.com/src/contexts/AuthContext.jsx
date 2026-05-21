import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { AUTH_USERNAME, AUTH_USERNAME_ALIASES, AUTH_PASSWORD } from '../lib/constants'

const AuthContext = createContext(null)
const STORAGE_KEY = 'pulse_auth_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
    }
    setReady(true)
  }, [])

  const login = useCallback((username, password) => {
    const u = username.trim()
    const p = password
    if (AUTH_USERNAME_ALIASES.includes(u) && p === AUTH_PASSWORD) {
      const session = { name: AUTH_USERNAME, role: 'Publisher', workspaceId: 'joseph-morgan' }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      setUser(session)
      return { ok: true }
    }
    return { ok: false, error: 'Invalid username or password' }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
