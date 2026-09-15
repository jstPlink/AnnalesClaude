import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNav } from '../../context/NavContext'
import { useAuth } from '../../context/AuthContext'
import { listNotesInRange, groupByDay, describeError } from '../../lib/notes'
import { listPeople } from '../../lib/people'
import OnThisDay from '../../components/OnThisDay'
import MonthPages from './MonthPages'
import { MONTHS_IT, addMonths, calendarGrid } from '../../lib/dates'

function ArrowIcon({ dir }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  )
}

// Placchetta lunga che "abbraccia" un valore (anno o mese): i pulsanti
// prima/dopo sono inglobati alle estremità della stessa pillola invece di
// essere cerchi separati. Cliccando nel mezzo si apre un menu a tendina per
// saltare direttamente a un valore non adiacente (anno o mese qualsiasi),
// più comodo dello scorrere un passo alla volta con le frecce.
function PillNav({ label, ariaLabel, prevLabel, nextLabel, onPrev, onNext, open, onToggle, widthClass, dropdown }) {
  return (
    // Il "relative" sta sul contenitore esterno (senza overflow-hidden):
    // il dropdown è posizionato rispetto a questo, non alla pillola vera e
    // propria, altrimenti l'overflow-hidden della pillola (che arrotonda
    // gli angoli delle frecce interne) lo taglierebbe via.
    <div className="relative">
      <div className="flex h-11 items-stretch overflow-hidden rounded-full border border-line bg-tag shadow-sm">
        <button
          type="button"
          aria-label={prevLabel}
          onClick={onPrev}
          className="flex w-10 shrink-0 items-center justify-center text-ink-soft transition hover:bg-panel hover:text-ink"
        >
          <ArrowIcon dir="left" />
        </button>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          onClick={onToggle}
          className={
            widthClass +
            ' shrink-0 truncate px-1 text-center font-serif text-2xl font-semibold text-ink transition hover:bg-panel/60'
          }
        >
          {label}
        </button>
        <button
          type="button"
          aria-label={nextLabel}
          onClick={onNext}
          className="flex w-10 shrink-0 items-center justify-center text-ink-soft transition hover:bg-panel hover:text-ink"
        >
          <ArrowIcon dir="right" />
        </button>
      </div>
      {open && dropdown}
    </div>
  )
}

export default function WebMonth() {
  const navigate = useNavigate()
  const { cursor, setCursor } = useNav()
  const { user } = useAuth()
  const immichUrl = user?.immichUrl?.trim()
  const immichApiKey = user?.immichApiKey?.trim()
  const [notes, setNotes] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openYear, setOpenYear] = useState(false)
  const [openMonth, setOpenMonth] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    if (!openYear && !openMonth) return
    const onDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
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

  const grid = useMemo(
    () => calendarGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

  // Elenco anni proposti nel menu a tendina: dal cursore (o dall'anno
  // corrente se il cursore è nel futuro) qualche anno avanti e parecchi
  // indietro, per raggiungere in un tap anche un anno lontano/non adiacente.
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    const base = Math.max(cursor.year, now)
    const years = []
    for (let y = base + 2; y >= base - 12; y--) years.push(y)
    return years
  }, [cursor.year])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listNotesInRange({
        start: `${grid[0].key} 00:00:00.000Z`,
        end: `${grid[41].key} 23:59:59.999Z`,
      })
      setNotes(list)
    } catch (err) {
      setError(describeError(err))
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [grid])

  useEffect(() => {
    load()
  }, [load])

  // Elenco persone (per le etichette coi nomi nella skin "Pagine"). Caricato
  // una volta; se fallisce, la skin resta senza targhette.
  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch(() => setPeople([]))
  }, [])

  const byDay = useMemo(() => groupByDay(notes), [notes])
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  )

  return (
    <div>
      <header className="mx-auto mb-6 flex w-3/5 flex-wrap items-center justify-between gap-4">
        <div ref={navRef} className="flex flex-wrap items-center gap-3">
          <PillNav
            label={cursor.year}
            ariaLabel="Scegli anno"
            prevLabel="Anno precedente"
            nextLabel="Anno successivo"
            widthClass="w-20"
            open={openYear}
            onPrev={() => setCursor((c) => ({ ...c, year: c.year - 1 }))}
            onNext={() => setCursor((c) => ({ ...c, year: c.year + 1 }))}
            onToggle={() => {
              setOpenYear((v) => !v)
              setOpenMonth(false)
            }}
            dropdown={
              <div className="absolute left-1/2 top-full z-30 mt-2 max-h-64 w-32 -translate-x-1/2 overflow-y-auto rounded-2xl border border-line bg-cream p-2 shadow-xl no-scrollbar">
                {yearOptions.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCursor((c) => ({ ...c, year: y }))
                      setOpenYear(false)
                    }}
                    className={
                      'block w-full rounded-xl px-3 py-2 text-center text-lg font-bold transition ' +
                      (y === cursor.year ? 'bg-sand text-ink' : 'text-ink-soft hover:bg-panel')
                    }
                  >
                    {y}
                  </button>
                ))}
              </div>
            }
          />
          <PillNav
            label={MONTHS_IT[cursor.month]}
            ariaLabel="Scegli mese"
            prevLabel="Mese precedente"
            nextLabel="Mese successivo"
            widthClass="w-40"
            open={openMonth}
            onPrev={() => setCursor((c) => addMonths(c, -1))}
            onNext={() => setCursor((c) => addMonths(c, 1))}
            onToggle={() => {
              setOpenMonth((v) => !v)
              setOpenYear(false)
            }}
            dropdown={
              <div className="absolute left-1/2 top-full z-30 mt-2 max-h-64 w-40 -translate-x-1/2 overflow-y-auto rounded-2xl border border-line bg-cream p-2 shadow-xl no-scrollbar">
                {MONTHS_IT.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCursor((c) => ({ ...c, month: i }))
                      setOpenMonth(false)
                    }}
                    className={
                      'block w-full rounded-xl px-3 py-2 text-center text-base font-bold transition ' +
                      (i === cursor.month ? 'bg-sand text-ink' : 'text-ink-soft hover:bg-panel')
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            }
          />
          <button
            type="button"
            onClick={() => {
              const t = new Date()
              setCursor({ year: t.getFullYear(), month: t.getMonth() })
              setOpenYear(false)
              setOpenMonth(false)
            }}
            className="flex h-11 shrink-0 items-center rounded-full border border-line bg-tag px-5 font-serif text-2xl font-semibold text-ink-soft shadow-sm transition hover:bg-panel hover:text-ink active:scale-95"
          >
            Oggi
          </button>
        </div>
        {loading && <span className="text-sm text-ink-soft">Aggiorno…</span>}
      </header>

      {error && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {error}
        </p>
      )}

      <OnThisDay className="mb-5 max-w-md" />

      <MonthPages
        grid={grid}
        byDay={byDay}
        monthLabel={MONTHS_IT[cursor.month]}
        onNavigate={navigate}
        peopleById={peopleById}
        immichUrl={immichUrl}
        immichApiKey={immichApiKey}
      />
    </div>
  )
}
