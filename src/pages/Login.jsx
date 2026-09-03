import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { describeError } from '../lib/notes'
import PhoneShell from '../components/PhoneShell'

export default function Login() {
  const { login, isAuthed, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/'

  if (ready && isAuthed) return <Navigate to={from} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col justify-center px-7 py-10">
        <div className="mb-10 flex flex-col items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-16 w-16" />
          <h1 className="text-3xl font-extrabold text-ink">Annales</h1>
          <p className="text-ink-soft">Il tuo diario personale</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl border border-line bg-panel px-4 py-3 text-base text-ink outline-none focus:border-ink-soft"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-2xl border border-line bg-panel px-4 py-3 text-base text-ink outline-none focus:border-ink-soft"
            />
          </label>

          {error && (
            <p className="rounded-2xl bg-delete/10 px-4 py-3 text-sm text-delete-dark">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-full bg-ink px-6 py-3 text-base font-bold text-cream shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {busy ? 'Accesso…' : 'Entra'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-ink-soft">
          Autenticazione tramite PocketBase (collection <code>users</code>).
        </p>
      </div>
    </PhoneShell>
  )
}
