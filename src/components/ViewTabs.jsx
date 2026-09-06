import { useNavigate } from 'react-router-dom'
import { haptic } from '../lib/haptics'

const TABS = [
  { key: 'calendar', path: '/', label: 'Calendario' },
  { key: 'data', path: '/dati', label: 'Andamento' },
  { key: 'stats', path: '/statistiche', label: 'Statistiche' },
]

// Selettore di vista (Calendario / Andamento / Statistiche): tab switcher,
// esteticamente distinto dai pulsanti solo-cliccabili del footer sottostante.
export default function ViewTabs({ active }) {
  const navigate = useNavigate()

  function go(path) {
    haptic()
    navigate(path)
  }

  return (
    <div className="flex justify-center border-t border-line bg-sand px-3 pt-3">
      <div className="mb-2 flex gap-1 rounded-full bg-panel p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => go(tab.path)}
            className={
              'rounded-full px-4 py-1.5 text-sm font-bold transition ' +
              (active === tab.key ? 'bg-ink text-cream shadow-sm' : 'text-ink-soft')
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
