import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
        size={14}
        strokeWidth={3}
      />
    </button>
  )
}

// Stessa idea di PlaqueArrow ma per lo skin="clock": una freccetta tonda
// semplice accanto all'orologio, invece che incorporata nella targhetta.
function ClockArrow({ dir, onClick, label }) {
  return (
    <button type="button" className="mclock-arrow" onClick={onClick} aria-label={label}>
      <Icon
        name={dir === 'prev' ? 'chevron-left' : 'chevron-right'}
        size={16}
        strokeWidth={3}
      />
    </button>
  )
}

// Menu a tendina di anno/mese per lo skin="clock": stessa estetica LCD
// dell'orologio che lo apre (schermo grigio, cifre col font digitale) —
// stesse classi .mn-* usate dalla vista mese web (WebMonth.jsx), non un
// elenco bianco generico. Va reso DENTRO al proprio .mclock-unit (non nel
// contenitore condiviso da mese+anno), altrimenti la posizione assoluta
// si allinea al bordo di quel contenitore invece che al pulsante giusto.
function ClockDropdownList({ items, wide }) {
  const listRef = useRef(null)
  const popRef = useRef(null)

  useLayoutEffect(() => {
    // Resta ancorato sotto il proprio pulsante (centrato), ma se così
    // uscirebbe dai bordi del "foglio" app (.app-paper: su schermi larghi
    // è un riquadro telefono centrato, non tutta la finestra — usare
    // window.innerWidth come limite lasciava uscire il menu oltre il bordo
    // ritagliato da overflow-hidden) si sposta quel tanto che basta per
    // restare visibile. Ricalcola a ogni cambio di dimensioni del box (non
    // solo al mount): il font digitale carica in modo asincrono e può
    // cambiare la larghezza del testo dopo il primo render, quando il
    // calcolo fatto una sola volta userebbe ancora le misure del font di
    // riserva.
    const el = popRef.current
    if (!el) return
    const reposition = () => {
      el.style.transform = 'translateX(-50%)'
      const bounds = el.closest('.app-paper')?.getBoundingClientRect()
      const boundLeft = bounds ? bounds.left : 0
      const boundRight = bounds ? bounds.right : window.innerWidth
      const rect = el.getBoundingClientRect()
      const margin = 10
      let shift = 0
      if (rect.left < boundLeft + margin) shift = boundLeft + margin - rect.left
      else if (rect.right > boundRight - margin) shift = boundRight - margin - rect.right
      el.style.transform = shift ? `translateX(calc(-50% + ${shift}px))` : 'translateX(-50%)'
    }
    reposition()
    const ro = new ResizeObserver(reposition)
    ro.observe(el)
    window.addEventListener('resize', reposition)
    // Rete di sicurezza esplicita per il caso più comune di cambio
    // larghezza dopo il mount: il font DSEG14 non ancora pronto al primo
    // render (il ResizeObserver dovrebbe già coprirlo, ma non si affida
    // solo a quello).
    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (!cancelled) reposition()
    })
    return () => {
      cancelled = true
      ro.disconnect()
      window.removeEventListener('resize', reposition)
    }
  }, [])

  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className={'mn-pop' + (wide ? ' wide' : '')} ref={popRef}>
      <div className="mn-list" ref={listRef}>
        {items.map(({ key, label, active, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={'mn-item' + (active ? ' active' : '')}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
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
  // skin="clock": orologio LCD digitale (vedi WebNote) al posto della
  // targhetta di plastica — usato in barra superiore mobile (vista mese,
  // Andamento, Statistiche).
  skin = 'plaque',
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
    if (skin === 'clock') {
      return (
        <div className="flex items-center gap-2" ref={ref}>
          <span className="mclock-unit">
            {onMonthStep && (
              <ClockArrow dir="prev" label="Mese precedente" onClick={() => onMonthStep(-1)} />
            )}
            <button
              type="button"
              onClick={() => {
                setOpenMonth((v) => !v)
                setOpenYear(false)
              }}
              className="mclock-face"
            >
              <span className="mclock-screen">
                <span className="mclock-digits">{subtitle}</span>
              </span>
            </button>
            {onMonthStep && (
              <ClockArrow dir="next" label="Mese successivo" onClick={() => onMonthStep(1)} />
            )}
            {openMonth && (
              <ClockDropdownList
                wide
                items={MONTHS_IT.map((m, i) => ({
                  key: m,
                  label: m,
                  active: i === month,
                  onClick: () => {
                    onMonthChange(i)
                    setOpenMonth(false)
                  },
                }))}
              />
            )}
          </span>
          <span className="mclock-unit">
            {onYearStep && (
              <ClockArrow dir="prev" label="Anno precedente" onClick={() => onYearStep(-1)} />
            )}
            <button
              type="button"
              onClick={() => {
                setOpenYear((v) => !v)
                setOpenMonth(false)
              }}
              className="mclock-face"
            >
              <span className="mclock-screen">
                <span className="mclock-digits">{year}</span>
              </span>
            </button>
            {onYearStep && (
              <ClockArrow dir="next" label="Anno successivo" onClick={() => onYearStep(1)} />
            )}
            {openYear && (
              <ClockDropdownList
                items={years.map((y) => ({
                  key: y,
                  label: y,
                  active: y === year,
                  onClick: () => {
                    onChange(y)
                    setOpenYear(false)
                  },
                }))}
              />
            )}
          </span>
        </div>
      )
    }
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

  if (skin === 'clock') {
    return (
      <div ref={ref}>
        <span className="mclock-unit">
          {onStep && <ClockArrow dir="prev" label="Precedente" onClick={() => onStep(-1)} />}
          <LabelTag
            type={readOnly ? undefined : 'button'}
            onClick={readOnly ? undefined : () => setOpenYear((v) => !v)}
            className="mclock-face"
          >
            <span className="mclock-screen">
              <span className="mclock-digits">
                {subtitle ? (
                  <>
                    {subtitle} {year}
                  </>
                ) : (
                  year
                )}
              </span>
            </span>
          </LabelTag>
          {onStep && <ClockArrow dir="next" label="Successivo" onClick={() => onStep(1)} />}
          {openYear && (
            <ClockDropdownList
              items={years.map((y) => ({
                key: y,
                label: y,
                active: y === year,
                onClick: () => {
                  onChange(y)
                  setOpenYear(false)
                },
              }))}
            />
          )}
        </span>
      </div>
    )
  }

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
