import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function WebProfile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const name = user?.name?.trim()
  const email = user?.email || '—'
  const initial = (name || email || '?').charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-serif text-4xl font-semibold tracking-tight text-ink">
        Profilo
      </h1>

      <div className="rounded-3xl border border-line bg-tag p-8">
        <div className="flex items-center gap-5">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-cream font-serif text-3xl font-semibold text-ink">
            {initial}
          </span>
          <div className="min-w-0">
            {name && (
              <p className="font-serif text-2xl font-semibold text-ink">{name}</p>
            )}
            <p className="truncate text-ink-soft">{email}</p>
          </div>
        </div>

        <dl className="mt-8 divide-y divide-line-soft border-y border-line-soft text-sm">
          <div className="flex items-center justify-between py-3">
            <dt className="text-ink-soft">Email</dt>
            <dd className="font-medium text-ink">{email}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-ink-soft">Autenticazione</dt>
            <dd className="font-medium text-ink">PocketBase · users</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="mt-8 w-full rounded-full border border-delete-dark bg-delete px-6 py-3 text-sm font-bold text-ink transition hover:brightness-105"
        >
          Esci
        </button>
      </div>
    </div>
  )
}
