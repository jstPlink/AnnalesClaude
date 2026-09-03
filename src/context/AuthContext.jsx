import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { pb } from '../lib/pocketbase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.record)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record ?? null)
    })

    if (pb.authStore.isValid) {
      // Rinnova il token e verifica che sia ancora valido lato server.
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }

    return unsubscribe
  }, [])

  const login = useCallback(async (email, password) => {
    return pb.collection('users').authWithPassword(email, password)
  }, [])

  const logout = useCallback(() => {
    pb.authStore.clear()
  }, [])

  const value = {
    user,
    isAuthed: Boolean(user) && pb.authStore.isValid,
    ready,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>')
  return ctx
}
