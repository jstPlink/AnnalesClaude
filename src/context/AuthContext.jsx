import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { pb } from '../lib/pocketbase'
import { setMoodGradient } from '../lib/mood'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.record)
  const [ready, setReady] = useState(false)

  // Gradiente del mood personalizzato (campo `moodGradient` sull'utente):
  // applicato in fase di render — non in un effect — così moodColor() usa i
  // colori scelti già al primo paint, senza flash del gradiente predefinito.
  // È una scrittura idempotente su una cache di modulo (src/lib/mood.js), e
  // `user` cambia via authStore.onChange, quindi ogni modifica si propaga.
  setMoodGradient(user?.moodGradient)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record ?? null)
    })

    if (pb.authStore.isValid) {
      // Rinnova il token e verifica che sia ancora valido lato server. La
      // sessione salvata si scarta SOLO se il server la rifiuta (401/403/404):
      // con rete assente o lenta (o server irraggiungibile) si resta dentro,
      // altrimenti offline toccherebbe rifare il login proprio quando non si
      // può — e l'app ha i dati in cache da mostrare (vedi src/lib/cache.js).
      const refresh = pb.collection('users')
        .authRefresh()
        .catch((err) => {
          if ([401, 403, 404].includes(err?.status)) pb.authStore.clear()
        })
      // Con rete lentissima non si tiene bloccata la schermata "Carico…":
      // dopo 4 s si parte con la sessione salvata e il rinnovo finisce dopo.
      Promise.race([refresh, new Promise((resolve) => setTimeout(resolve, 4000))]).finally(() =>
        setReady(true),
      )
    } else {
      setReady(true)
    }

    return unsubscribe
  }, [])

  const login = useCallback(async (email, password) => {
    return pb.collection('users').authWithPassword(email, password)
  }, [])

  const signup = useCallback(async (email, password, extra = {}) => {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      ...extra,
    })
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
    signup,
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
