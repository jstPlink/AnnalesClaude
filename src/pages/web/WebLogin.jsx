import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { describeError } from '../../lib/notes'

const MIN_PASSWORD = 8

const field =
  'w-full rounded-xl border border-line bg-cream px-4 py-3 text-[15px] text-ink outline-none transition focus:border-ink-soft'

export default function WebLogin() {
  const { login, signup, isAuthed, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/web'
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
        await signup(
          email.trim(),
          password,
          name.trim() ? { name: name.trim() } : {},
        )
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

          <h2 className="font-serif text-3xl font-semibold">
            {isSignup ? 'Crea il tuo account' : 'Bentornato'}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {isSignup
              ? 'Bastano email e password.'
              : 'Accedi per continuare il tuo diario.'}
          </p>

          <div className="mt-6 flex rounded-full border border-line bg-tag p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => mode !== 'login' && switchMode()}
              className={
                'flex-1 rounded-full py-2 transition ' +
                (!isSignup ? 'bg-cream text-ink shadow-sm' : 'text-ink-soft')
              }
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => mode !== 'signup' && switchMode()}
              className={
                'flex-1 rounded-full py-2 transition ' +
                (isSignup ? 'bg-cream text-ink shadow-sm' : 'text-ink-soft')
              }
            >
              Registrati
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3.5">
            {isSignup && (
              <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
                Nome <span className="font-normal">(facoltativo)</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={field}
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
                className={field}
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
                className={field}
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
                  className={field}
                />
              </label>
            )}

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
            className="mt-5 text-sm text-ink-soft underline underline-offset-2"
          >
            {isSignup
              ? 'Hai già un account? Accedi'
              : 'Non hai un account? Registrati'}
          </button>
        </div>
      </div>
    </div>
  )
}
