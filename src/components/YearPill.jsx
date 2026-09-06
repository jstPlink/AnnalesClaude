import { useEffect, useRef, useState } from 'react'
import { MONTHS_IT } from '../lib/dates'

// Pillola arrotondata con l'anno. Tap → selezione rapida di un altro anno.
// Se `subtitle` è presente (es. "20 Settembre") viene mostrato accanto
// (layout="row") o sotto (layout="column", default) l'anno.
// Se sono presenti anche `month` (0–11) e `onMonthChange`, il sottotitolo
// diventa un pulsante separato e cliccabile per scegliere il mese.
export default function YearPill({
  year,
  onChange,
  subtitle = null,
  month = null,
  onMonthChange,
  span = 8,
  minWidth = 128,
  layout = 'column',
}) {
  const [openYear, setOpenYear] = useState(false)
  const [openMonth, setOpenMonth] = useState(false)
  const ref = useRef(null)

  const monthSelectable = typeof onMonthChange === 'function' && month != null

  useEffect(() => {
    if (!openYear && !openMonth) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpenYear(false)
        setOpenMonth(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenYear(false)
        setOpenMonth(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openYear, openMonth])

  const now = new Date().getFullYear()
  const base = Math.max(year, now)
  const years = []
  for (let y = base + 2; y >= base - span; y--) years.push(y)

  // Senza `onChange` la pillola è solo informativa (es. modifica nota: la
  // data non si cambia).
  const readOnly = typeof onChange !== 'function'

  // Anno e mese entrambi selezionabili: due pulsanti affiancati, ciascuno
  // con il proprio menu.
  if (monthSelectable) {
    return (
      <div className="relative flex items-center gap-2" ref={ref} style={{ minWidth }}>
        <button
          type="button"
          onClick={() => {
            setOpenYear((v) => !v)
            setOpenMonth(false)
          }}
          className="rounded-full border border-line bg-tag px-4 py-1.5 text-xl font-bold text-ink shadow-sm transition active:scale-95"
        >
          {year}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpenMonth((v) => !v)
            setOpenYear(false)
          }}
          className="max-w-full truncate rounded-full border border-line bg-tag px-4 py-1.5 text-xl font-bold text-ink shadow-sm transition active:scale-95"
        >
          {subtitle}
        </button>

        {openYear && (
          <div className="absolute left-0 top-full z-30 mt-2 max-h-64 w-32 overflow-y-auto rounded-2xl border border-line bg-cream p-2 shadow-xl no-scrollbar">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  onChange(y)
                  setOpenYear(false)
                }}
                className={
                  'block w-full rounded-xl px-3 py-2 text-center text-lg font-bold transition ' +
                  (y === year ? 'bg-sand text-ink' : 'text-ink-soft hover:bg-panel')
                }
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {openMonth && (
          <div className="absolute right-0 top-full z-30 mt-2 max-h-64 w-40 overflow-y-auto rounded-2xl border border-line bg-cream p-2 shadow-xl no-scrollbar">
            {MONTHS_IT.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onMonthChange(i)
                  setOpenMonth(false)
                }}
                className={
                  'block w-full rounded-xl px-3 py-2 text-center text-base font-bold transition ' +
                  (i === month ? 'bg-sand text-ink' : 'text-ink-soft hover:bg-panel')
                }
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => !readOnly && setOpenYear((v) => !v)}
        style={{ minWidth }}
        className={
          'flex max-w-full items-center justify-center px-5 py-1.5 ' +
          (layout === 'row' ? 'flex-row gap-2' : 'flex-col') +
          ' ' +
          (readOnly
            ? ''
            : 'rounded-full border border-line bg-tag shadow-sm transition active:scale-95')
        }
      >
        <span
          className={
            'leading-tight text-ink ' +
            (layout === 'row'
              ? 'text-xl font-bold'
              : subtitle
                ? 'text-base font-semibold'
                : 'text-2xl font-semibold')
          }
        >
          {year}
        </span>
        {subtitle && (
          <span
            className={
              'max-w-full truncate leading-tight ' +
              (layout === 'row'
                ? 'text-xl font-bold text-ink'
                : 'text-base font-extrabold text-ink-soft')
            }
          >
            {subtitle}
          </span>
        )}
      </button>

      {openYear && (
        <div className="absolute left-1/2 z-30 mt-2 max-h-64 w-40 -translate-x-1/2 overflow-y-auto rounded-2xl border border-line bg-cream p-2 shadow-xl no-scrollbar">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                onChange(y)
                setOpenYear(false)
              }}
              className={
                'block w-full rounded-xl px-3 py-2 text-center text-lg font-bold transition ' +
                (y === year
                  ? 'bg-sand text-ink'
                  : 'text-ink-soft hover:bg-panel')
              }
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
