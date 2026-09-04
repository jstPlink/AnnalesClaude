import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { haptic } from '../lib/haptics'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const name = user?.name?.trim()
  const email = user?.email || '—'
  const initial = (name || email || '?').charAt(0).toUpperCase()

  function onLogout() {
    haptic()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="grid grid-cols-[3rem_1fr_3rem] items-center px-4 pb-3">
          <CircleButton size={40} onClick={() => navigate('/')} title="Indietro">
            <Icon name="chevron-left" size={20} />
          </CircleButton>
          <h2 className="text-center text-2xl font-extrabold text-ink">Profilo</h2>
          <span />
        </div>
      </header>

      <main className="flex flex-1 flex-col px-6 py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-sand text-3xl font-extrabold text-ink">
            {initial}
          </div>
          {name && <p className="text-xl font-bold text-ink">{name}</p>}
          <p className="text-ink-soft">{email}</p>
        </div>

        <div className="mt-10 space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Account
          </p>
          <div className="rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink-soft">Email</span>
              <span className="max-w-[60%] truncate text-sm font-medium text-ink">
                {email}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-auto flex items-center justify-center gap-2 rounded-full border border-delete-dark bg-delete px-6 py-3 text-base font-bold text-ink shadow-sm transition active:scale-95"
        >
          <Icon name="logout" size={18} />
          Esci
        </button>
      </main>
    </PhoneShell>
  )
}
