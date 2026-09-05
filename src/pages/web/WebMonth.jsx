import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNav } from '../../context/NavContext'
import {
  listNotesInRange,
  groupByDay,
  describeError,
  plainText,
} from '../../lib/notes'
import { dayMood, moodColor, moodTextColor, isNoteworthyMood } from '../../lib/mood'
import { fileUrl } from '../../lib/pocketbase'
import {
  MONTHS_IT,
  addMonths,
  calendarGrid,
  parseWall,
  todayKey,
  weekdayShort,
} from '../../lib/dates'

function NavArrow({ dir, onClick, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-tag hover:text-ink"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

export default function WebMonth() {
  const navigate = useNavigate()
  const { cursor, setCursor } = useNav()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const grid = useMemo(
    () => calendarGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  )

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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <NavArrow
              dir="left"
              label="Anno precedente"
              onClick={() => setCursor((c) => ({ ...c, year: c.year - 1 }))}
            />
            <span className="w-14 text-center font-serif text-3xl font-semibold text-ink">
              {cursor.year}
            </span>
            <NavArrow
              dir="right"
              label="Anno successivo"
              onClick={() => setCursor((c) => ({ ...c, year: c.year + 1 }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <NavArrow
              dir="left"
              label="Mese precedente"
              onClick={() => setCursor((c) => addMonths(c, -1))}
            />
            <h1 className="w-40 text-center font-serif text-3xl font-semibold tracking-tight text-ink">
              {MONTHS_IT[cursor.month]}
            </h1>
            <NavArrow
              dir="right"
              label="Mese successivo"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const t = new Date()
              setCursor({ year: t.getFullYear(), month: t.getMonth() })
            }}
            className="font-serif text-3xl font-semibold text-ink-soft transition hover:text-ink"
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

      <div className="divide-y divide-line-soft overflow-hidden rounded-3xl border border-line">
        {grid
          .filter((cell) => cell.inMonth)
          .map((cell) => {
            const dayNotes = byDay.get(cell.key) || []
            const has = dayNotes.length > 0
            const mood = has ? dayMood(dayNotes) : null
            const isToday = cell.key === todayK
            const isWeekend = cell.weekday === 0 || cell.weekday === 6
            const dayNum = parseWall(cell.key)?.d ?? ''

            const titles = dayNotes
              .filter((n) => isNoteworthyMood(n.mood))
              .map((n) => n.title || plainText(n.content).slice(0, 80))
              .filter(Boolean)
            const imgs = dayNotes
              .flatMap((n) =>
                (n.images || []).map((fn) => fileUrl(n, fn, { thumb: '200x200' })),
              )
              .slice(0, 2)

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
                <span className="flex w-full items-stretch gap-4 px-4 py-3">
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
                          >
                            {t}
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
                    <span className="flex shrink-0 gap-2">
                      {imgs.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          loading="lazy"
                          className="h-full w-28 rounded-2xl object-cover"
                        />
                      ))}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
      </div>
    </div>
  )
}
