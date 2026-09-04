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
import { MONTHS_IT, calendarGrid, parseWall, todayKey, weekdayShort } from '../../lib/dates'

export default function WebMonth() {
  const navigate = useNavigate()
  const { cursor } = useNav()
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
      <header className="mb-6 flex items-end justify-between">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          {MONTHS_IT[cursor.month]}{' '}
          <span className="text-ink-soft">{cursor.year}</span>
        </h1>
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
            const img = dayNotes.flatMap((n) =>
              (n.images || []).map((fn) => fileUrl(n, fn, { thumb: '100x100' })),
            )[0]

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => navigate(`/day/${cell.key}`)}
                className={
                  'flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-tag ' +
                  (isToday ? 'bg-tag' : 'bg-cream') +
                  (has ? '' : ' opacity-60')
                }
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-serif text-lg font-semibold leading-none"
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
                  {dayNum}
                </span>

                <span
                  className={
                    'w-10 shrink-0 text-xs font-semibold uppercase tracking-wide ' +
                    (isWeekend ? 'text-weekend/80' : 'text-ink-soft')
                  }
                >
                  {weekdayShort(cell.key)}
                </span>

                <span className="min-w-0 flex-1">
                  {titles.length ? (
                    <span className="block truncate text-sm font-medium text-ink">
                      {titles.join(' · ')}
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

                {img && (
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                  />
                )}
              </button>
            )
          })}
      </div>
    </div>
  )
}
