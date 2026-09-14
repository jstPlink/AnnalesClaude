import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { MONTHS_IT } from '../lib/dates'

// Freccia ai lati della targhetta: renderizzata dal chiamante solo quando
// passa uno stepper (`onYearStep`/`onMonthStep`/`onStep`) — altrimenti la
// targhetta resta senza, invariata per chi non ne ha bisogno.
function PlaqueArrow({ dir, onClick, label }) {
  return (
    <button type="button" className="mplaque-arrow" onClick={onClick} aria-label={label}>
      <Icon
        name={dir === 'prev' ? 'chevron-left' : 'chevron-right'}
        size={11}
        strokeWidth={3}
      />
    </button>
  )
}

// Targhetta di plastica giallo ocra con anno (e, se presenti `month`+
// `onMonthChange`, anche il mese come seconda targhetta separata). Tap sul
// "vetro" → apre il selettore esistente; le frecce (quando passati
// `onYearStep`/`onMonthStep`/`onStep`) spostano di ±1 senza aprirlo.
// Se `subtitle` è presente (es. "20 Settembre") viene mostrato accanto
// (layout="row") o sotto (layout="column", default) l'anno.
export default function YearPill({
  year,
  onChange,
  subtitle = null,
  month = null,
  onMonthChange,
  onYearStep,
  onMonthStep,
  onStep,
  span = 8,
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
      <div className="relative flex items-center gap-2" ref={ref}>
        <span className="mplaque mplaque-month">
          {onMonthStep && (
            <PlaqueArrow dir="prev" label="Mese precedente" onClick={() => onMonthStep(-1)} />
          )}
          <button
            type="button"
            onClick={() => {
              setOpenMonth((v) => !v)
              setOpenYear(false)
            }}
            className="mplaque-label"
          >
            {subtitle}
          </button>
          {onMonthStep && (
            <PlaqueArrow dir="next" label="Mese successivo" onClick={() => onMonthStep(1)} />
          )}
        </span>
        <span className="mplaque mplaque-year">
          {onYearStep && (
            <PlaqueArrow dir="prev" label="Anno precedente" onClick={() => onYearStep(-1)} />
          )}
          <button
            type="button"
            onClick={() => {
              setOpenYear((v) => !v)
              setOpenMonth(false)
            }}
            className="mplaque-label"
          >
            {year}
          </button>
          {onYearStep && (
            <PlaqueArrow dir="next" label="Anno successivo" onClick={() => onYearStep(1)} />
          )}
        </span>

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

  const LabelTag = readOnly ? 'span' : 'button'

  return (
    <div className="relative" ref={ref}>
      <span className={'mplaque' + (subtitle ? ' mplaque-day' : ' mplaque-year')}>
        {onStep && <PlaqueArrow dir="prev" label="Precedente" onClick={() => onStep(-1)} />}
        <LabelTag
          type={readOnly ? undefined : 'button'}
          onClick={readOnly ? undefined : () => setOpenYear((v) => !v)}
          className="mplaque-label"
        >
          {layout === 'row' && subtitle ? (
            <>
              {subtitle} {year}
            </>
          ) : subtitle ? (
            <>
              {year}
              <br />
              {subtitle}
            </>
          ) : (
            year
          )}
        </LabelTag>
        {onStep && <PlaqueArrow dir="next" label="Successivo" onClick={() => onStep(1)} />}
      </span>

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
