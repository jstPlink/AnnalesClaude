import { useEffect, useRef, useState } from 'react'
import {
  MONTHS_IT,
  addMonths,
  calendarGrid,
  dayMonthLabel,
  parseWall,
} from '../lib/dates'

function NavArrow({ dir, onClick, label }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="dp-cal-arrow">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

// Pulsante "20 Settembre" che apre un calendario a comparsa per scegliere
// mese e giorno (l'anno si può attraversare navigando i mesi, ma non è
// esposto come controllo separato: quello vive altrove nella pagina).
export default function DatePickerPopover({
  dateKey,
  onChange,
  className = '',
  textClassName = 'text-sm font-semibold',
  buttonClassName = 'max-w-full truncate rounded-full border border-line bg-tag px-4 py-1.5 text-ink transition active:scale-95',
  children,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const parsed = parseWall(dateKey)

  function openPicker() {
    setView({ year: parsed?.y ?? new Date().getFullYear(), month: (parsed?.mo ?? 1) - 1 })
    setOpen(true)
  }

  if (!view && open) return null
  const grid = view ? calendarGrid(view.year, view.month) : []

  return (
    <div className={'relative ' + className} ref={ref}>
      <button
        type="button"
        onClick={openPicker}
        aria-label={ariaLabel}
        className={buttonClassName + ' ' + textClassName}
      >
        {children ?? dayMonthLabel(dateKey)}
      </button>

      {open && view && (
        <div className="dp-cal">
          <div className="dp-cal-head">
            <NavArrow dir="left" label="Mese precedente" onClick={() => setView((v) => addMonths(v, -1))} />
            <span className="dp-cal-title">
              {MONTHS_IT[view.month]} {view.year}
            </span>
            <NavArrow dir="right" label="Mese successivo" onClick={() => setView((v) => addMonths(v, 1))} />
          </div>
          <div className="dp-cal-week">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="dp-cal-grid">
            {grid.map((cell) => {
              const selected = cell.key === dateKey
              const day = parseWall(cell.key)?.d
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    onChange(cell.key)
                    setOpen(false)
                  }}
                  className={'dp-cal-day' + (selected ? ' selected' : cell.inMonth ? '' : ' muted')}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
