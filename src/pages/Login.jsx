import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { describeError } from '../lib/notes'
import { haptic } from '../lib/haptics'
import PhoneShell from '../components/PhoneShell'

const MIN_PASSWORD = 8

export default function Login() {
  const { login, signup, isAuthed, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/'
  const isSignup = mode === 'signup'

  if (ready && isAuthed) return <Navigate to={from} replace />

  function switchMode() {
    setMode((m) => (m === 'login' ? 'signup' : 'login'))
    setError('')
    setPassword('')
    setPasswordConfirm('')
  }

  async function onSubmit(e) {
    e.preventDefault()
    haptic()
    setError('')

    if (isSignup) {
      if (password.length < MIN_PASSWORD) {
        setError(`La password deve avere almeno ${MIN_PASSWORD} caratteri.`)
        return
      }
      if (password !== passwordConfirm) {
        setError('Le due password non coincidono.')
        return
      }
    }

    setBusy(true)
    try {
      if (isSignup) {
        await signup(email.trim(), password, name.trim() ? { name: name.trim() } : {})
      } else {
        await login(email.trim(), password)
      }
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
        <div className="mb-9 flex flex-col items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-16 w-16" />
          <h1 className="text-3xl font-extrabold text-ink">Annales</h1>
          <p className="text-ink-soft">
            {isSignup ? 'Crea il tuo diario personale' : 'Il tuo diario personale'}
          </p>
        </div>

        <div className="mb-6 flex rounded-full border border-line bg-panel p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => mode !== 'login' && switchMode()}
            className={
              'flex-1 rounded-full py-2 transition ' +
              (!isSignup ? 'bg-sand text-ink shadow-sm' : 'text-ink-soft')
            }
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => mode !== 'signup' && switchMode()}
            className={
              'flex-1 rounded-full py-2 transition ' +
              (isSignup ? 'bg-sand text-ink shadow-sm' : 'text-ink-soft')
            }
          >
            Registrati
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {isSignup && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
              Nome <span className="font-normal">(facoltativo)</span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl border border-line bg-panel px-4 py-3 text-base text-ink outline-none focus:border-ink-soft"
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
            Email
            <input
              type="email"
              autoComplete={isSignup ? 'email' : 'username'}
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
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={isSignup ? MIN_PASSWORD : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-2xl border border-line bg-panel px-4 py-3 text-base text-ink outline-none focus:border-ink-soft"
            />
          </label>

          {isSignup && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
              Conferma password
              <input
                type="password"
                autoComplete="new-password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="rounded-2xl border border-line bg-panel px-4 py-3 text-base text-ink outline-none focus:border-ink-soft"
              />
            </label>
          )}

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
            {busy
              ? isSignup
                ? 'Creazione…'
                : 'Accesso…'
              : isSignup
                ? 'Crea account'
                : 'Entra'}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-6 text-center text-sm text-ink-soft underline underline-offset-2"
        >
          {isSignup
            ? 'Hai già un account? Accedi'
            : 'Non hai un account? Registrati'}
        </button>

        <p className="mt-6 text-center text-xs text-ink-soft">
          Autenticazione tramite PocketBase (collection <code>users</code>).
        </p>
      </div>
    </PhoneShell>
  )
}
