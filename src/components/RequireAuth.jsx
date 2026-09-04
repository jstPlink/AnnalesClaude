import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Protegge le rotte: se non autenticati, redirect al login.
export default function RequireAuth({ children, redirectTo = '/login' }) {
  const { isAuthed, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream text-ink-soft">
        Carico…
      </div>
    )
  }

  if (!isAuthed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return children
}
