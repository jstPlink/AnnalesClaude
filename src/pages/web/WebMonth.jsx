import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNav } from '../../context/NavContext'
import {
  listNotesInRange,
  groupByDay,
  describeError,
  plainText,
} from '../../lib/notes'
import { dayMood, moodColor, moodTextColor, moodTitleOpacity } from '../../lib/mood'
import { fileUrl } from '../../lib/pocketbase'
import { getSkinMonth, setSkinMonth } from '../../lib/prefs'
import OnThisDay from '../../components/OnThisDay'
import Icon from '../../components/Icon'
import MonthBoard from './MonthBoard'
import MonthPages from './MonthPages'
import {
  MONTHS_IT,
  addMonths,
  calendarGrid,
  parseWall,
  todayKey,
  weekdayShort,
} from '../../lib/dates'

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
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openYear, setOpenYear] = useState(false)
  const [openMonth, setOpenMonth] = useState(false)
  const [skinMonth, setSkinMonthState] = useState(getSkinMonth())
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

  const byDay = useMemo(() => groupByDay(notes), [notes])
  const todayK = todayKey()

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
          <div
            role="group"
            aria-label="Stile vista mese"
            className="flex h-11 shrink-0 items-center gap-0.5 rounded-full border border-line bg-tag p-1 shadow-sm"
          >
            {[
              { v: 'plain', icon: 'list', label: 'Elenco' },
              { v: 'board', icon: 'image', label: 'Bacheca' },
              { v: 'pages', icon: 'edit', label: 'Pagine' },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => {
                  setSkinMonthState(o.v)
                  setSkinMonth(o.v)
                }}
                aria-pressed={skinMonth === o.v}
                title={o.label}
                className={
                  'flex h-9 w-9 items-center justify-center rounded-full transition ' +
                  (skinMonth === o.v
                    ? 'bg-ink text-cream'
                    : 'text-ink-soft hover:bg-panel hover:text-ink')
                }
              >
                <Icon name={o.icon} size={17} />
              </button>
            ))}
          </div>
        </div>
        {loading && <span className="text-sm text-ink-soft">Aggiorno…</span>}
      </header>

      {error && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {error}
        </p>
      )}

      <OnThisDay className="mb-5 max-w-md" />

      {skinMonth === 'board' ? (
        <MonthBoard
          grid={grid}
          byDay={byDay}
          monthLabel={MONTHS_IT[cursor.month]}
          onNavigate={navigate}
        />
      ) : skinMonth === 'pages' ? (
        <MonthPages
          grid={grid}
          byDay={byDay}
          monthLabel={MONTHS_IT[cursor.month]}
          onNavigate={navigate}
        />
      ) : (
      <div className="mx-auto w-3/5 divide-y divide-line-soft overflow-hidden rounded-3xl border border-line">
        {grid
          .filter((cell) => cell.inMonth)
          .map((cell) => {
            const dayNotes = byDay.get(cell.key) || []
            const has = dayNotes.length > 0
            const mood = has ? dayMood(dayNotes) : null
            const isToday = cell.key === todayK
            const isWeekend = cell.weekday === 0 || cell.weekday === 6
            const dayNum = parseWall(cell.key)?.d ?? ''

            // Titoli di tutte le note del giorno (nessun filtro sul mood:
            // quelle vicine al centro scala sfumano invece di sparire, vedi
            // moodTitleOpacity).
            const titles = dayNotes
              .map((n) => ({
                text: n.title || plainText(n.content).slice(0, 80),
                mood: n.mood,
              }))
              .filter((t) => t.text)
            const imgs = dayNotes
              .flatMap((n) =>
                (n.images || []).map((fn) => fileUrl(n, fn, { thumb: '200x200' })),
              )
              .slice(0, 2)
            // L'altezza della riga dipende SOLO dal numero di note del giorno:
            // è un valore fisso (height, non min-height) e la riga è
            // overflow-hidden, così le immagini all'interno vengono ritagliate
            // e non allungano più la riga. La base (92px) è poco sopra
            // l'altezza della targhetta giorno, così l'aumento è visibile fin
            // dalla seconda nota.
            const rowH = Math.min(92 + Math.max(0, dayNotes.length - 1) * 22, 280)

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => navigate(`/day/${cell.key}`)}
                className={
                  'flex w-full items-stretch text-left transition hover:bg-tag ' +
                  (isToday ? 'bg-tag' : 'bg-cream') +
                  (has ? '' : ' opacity-60')
                }
              >
                <span
                  className="flex w-full items-stretch gap-4 overflow-hidden px-4 py-3"
                  style={{ height: rowH }}
                >
                  <span
                    className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl"
                    style={
                      has
                        ? { backgroundColor: moodColor(mood), color: moodTextColor(mood) }
                        : {
                            border: '1px solid var(--color-line)',
                            color: isWeekend
                              ? 'var(--color-weekend)'
                              : 'var(--color-ink-soft)',
                          }
                    }
                  >
                    <span className="font-serif text-2xl font-semibold leading-none">
                      {dayNum}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {weekdayShort(cell.key)}
                    </span>
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col justify-center py-1">
                    {titles.length ? (
                      <span className="flex flex-col gap-1">
                        {titles.map((t, i) => (
                          <span
                            key={i}
                            className="max-w-full truncate text-sm font-medium text-ink"
                            style={{ opacity: moodTitleOpacity(t.mood) }}
                          >
                            {t.text}
                          </span>
                        ))}
                      </span>
                    ) : has ? (
                      <span className="block text-sm text-ink-soft">
                        {dayNotes.length} {dayNotes.length === 1 ? 'nota' : 'note'}
                      </span>
                    ) : (
                      <span className="block text-sm text-ink-soft/60">
                        Nessuna nota
                      </span>
                    )}
                  </span>

                  {imgs.length > 0 && (
                    <span className="flex h-full shrink-0 gap-2 overflow-hidden">
                      {imgs.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          loading="lazy"
                          className="h-full w-28 shrink-0 rounded-2xl object-cover"
                        />
                      ))}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
      </div>
      )}
    </div>
  )
}
