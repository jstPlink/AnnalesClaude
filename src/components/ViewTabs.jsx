import { useNavigate } from 'react-router-dom'
import { haptic } from '../lib/haptics'

// Selettore di vista (Calendario / Statistiche): tab switcher, esteticamente
// distinto dai pulsanti solo-cliccabili del footer sottostante.
export default function ViewTabs({ active }) {
  const navigate = useNavigate()

  function go(path) {
    haptic()
    navigate(path)
  }

  return (
    <div className="flex justify-center border-t border-line bg-sand px-5 pt-3">
      <div className="mb-2 flex gap-1 rounded-full bg-panel p-1">
        <button
          type="button"
          onClick={() => go('/')}
          className={
            'rounded-full px-5 py-1.5 text-sm font-bold transition ' +
            (active === 'calendar'
              ? 'bg-ink text-cream shadow-sm'
              : 'text-ink-soft')
          }
        >
          Calendario
        </button>
        <button
          type="button"
          onClick={() => go('/dati')}
          className={
            'rounded-full px-5 py-1.5 text-sm font-bold transition ' +
            (active === 'data' ? 'bg-ink text-cream shadow-sm' : 'text-ink-soft')
          }
        >
          Statistiche
        </button>
      </div>
    </div>
  )
}
