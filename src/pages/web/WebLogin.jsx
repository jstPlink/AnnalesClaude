import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { describeError } from '../../lib/notes'

const field =
  'w-full rounded-xl border border-line bg-cream px-4 py-3 text-[15px] text-ink outline-none transition focus:border-ink-soft'

// Solo accesso: la registrazione pubblica è chiusa (gli account si creano
// dal pannello admin di PocketBase).
export default function WebLogin() {
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
    setError('')
    setBusy(true)
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
    <div className="grid min-h-dvh w-full bg-cream text-ink lg:grid-cols-2">
      {/* Pannello decorativo */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-sand p-12 lg:flex">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          <span className="font-serif text-2xl font-semibold">Annales</span>
        </div>
        <div>
          <h1 className="font-serif text-5xl font-semibold leading-tight">
            Il diario
            <br />
            che tiene il ritmo
            <br />
            delle tue giornate.
          </h1>
          <p className="mt-5 max-w-sm text-ink-soft">
            Annota momenti, umore e immagini. Rivedi il mese a colpo d'occhio,
            un giorno alla volta.
          </p>
        </div>
        <p className="text-xs text-ink-soft">Diario personale · PWA</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-serif text-3xl font-semibold">Annales</span>
          </div>

          <h2 className="font-serif text-3xl font-semibold">Bentornato</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Accedi per continuare il tuo diario.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3.5">
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
              Email
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
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
                className={field}
              />
            </label>

            {error && (
              <p className="rounded-xl bg-delete/15 px-4 py-2.5 text-sm text-delete-dark">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-cream transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Accesso…' : 'Entra'}
            </button>
          </form>

          <p className="mt-5 text-xs text-ink-soft">
            Registrazione chiusa: gli account si creano dal pannello admin di
            PocketBase.
          </p>
        </div>
      </div>
    </div>
  )
}
