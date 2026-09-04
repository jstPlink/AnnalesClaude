import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNav } from '../../context/NavContext'
import { MONTHS_IT, addMonths, todayKey } from '../../lib/dates'

function NavArrow({ dir, onClick, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-cream"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { cursor, setCursor } = useNav()

  const name = user?.name?.trim() || user?.email || 'Utente'
  const initial = name.charAt(0).toUpperCase()

  function move(part, delta) {
    setCursor((c) => {
      if (part === 'year') return { ...c, year: c.year + delta }
      return addMonths(c, delta)
    })
    navigate('/')
  }

  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-line bg-sand">
      <div className="flex items-center gap-2.5 px-6 pb-5 pt-7">
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <span className="font-serif text-2xl font-semibold text-ink">Annales</span>
      </div>

      <div className="mx-4 rounded-2xl border border-line bg-cream/70 p-4">
        <div className="flex items-center justify-between">
          <NavArrow dir="left" label="Anno precedente" onClick={() => move('year', -1)} />
          <span className="font-serif text-xl font-semibold text-ink">
            {cursor.year}
          </span>
          <NavArrow dir="right" label="Anno successivo" onClick={() => move('year', 1)} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <NavArrow dir="left" label="Mese precedente" onClick={() => move('month', -1)} />
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-serif text-lg text-ink-soft transition hover:text-ink"
          >
            {MONTHS_IT[cursor.month]}
          </button>
          <NavArrow dir="right" label="Mese successivo" onClick={() => move('month', 1)} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/note/new?date=${todayKey()}`)}
        className="mx-4 mt-5 flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-cream transition hover:brightness-110"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nuova nota
      </button>

      <nav className="mt-6 flex flex-col gap-1 px-4 text-sm font-semibold">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            'rounded-xl px-3 py-2 transition ' +
            (isActive ? 'bg-cream text-ink' : 'text-ink-soft hover:bg-cream/60')
          }
        >
          Calendario
        </NavLink>
        <NavLink
          to={`/day/${todayKey()}`}
          className={({ isActive }) =>
            'rounded-xl px-3 py-2 transition ' +
            (isActive ? 'bg-cream text-ink' : 'text-ink-soft hover:bg-cream/60')
          }
        >
          Oggi
        </NavLink>
        <NavLink
          to="/dati"
          className={({ isActive }) =>
            'rounded-xl px-3 py-2 transition ' +
            (isActive ? 'bg-cream text-ink' : 'text-ink-soft hover:bg-cream/60')
          }
        >
          Andamento
        </NavLink>
      </nav>

      <div className="mt-auto border-t border-line p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/profilo')}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-cream/60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-cream font-serif text-lg font-semibold text-ink">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">
                {user?.name?.trim() || 'Profilo'}
              </span>
              <span className="block truncate text-xs text-ink-soft">
                {user?.email}
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Esci"
            title="Esci"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-cream"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
