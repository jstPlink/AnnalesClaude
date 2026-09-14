import { useNavigate } from 'react-router-dom'
import { haptic } from '../lib/haptics'

const TABS = [
  { key: 'calendar', path: '/', label: 'Calendario' },
  { key: 'data', path: '/dati', label: 'Andamento' },
  { key: 'stats', path: '/statistiche', label: 'Statistiche' },
]

// Selettore di vista (Calendario / Andamento / Statistiche): un'unica
// striscia di cartoncino bianco — una targhetta rettangolare in metallo
// dorato inquadra l'opzione attiva e scivola sopra quella scelta.
export default function ViewTabs({ active }) {
  const navigate = useNavigate()
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.key === active))

  function go(path) {
    haptic()
    navigate(path)
  }

  return (
    <div className="mtabs">
      <div
        className="mtab-plaque"
        style={{ left: `calc(${activeIndex} * 33.333%)` }}
        aria-hidden="true"
      />
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => go(tab.path)}
          className={'mtab' + (tab.key === active ? ' active' : '')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
