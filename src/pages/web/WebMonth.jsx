import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  listNotesInRange,
  groupByDay,
  describeError,
  plainText,
} from '../../lib/notes'
import { dayMood, moodColor, moodTextColor, isNoteworthyMood } from '../../lib/mood'
import { fileUrl } from '../../lib/pocketbase'
import { MONTHS_IT, calendarGrid, parseWall, todayKey } from '../../lib/dates'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function WebMonth() {
  const navigate = useNavigate()
  const { cursor } = useOutletContext()
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

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-3xl border border-line bg-line">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={
              'bg-sand py-2.5 text-center text-xs font-bold uppercase tracking-wider ' +
              (i >= 5 ? 'text-weekend/80' : 'text-ink-soft')
            }
          >
            {w}
          </div>
        ))}

        {grid.map((cell) => {
          const dayNotes = byDay.get(cell.key) || []
          const has = dayNotes.length > 0
          const mood = has ? dayMood(dayNotes) : null
          const isToday = cell.key === todayK
          const isWeekend = cell.weekday === 0 || cell.weekday === 6
          const dayNum = parseWall(cell.key)?.d ?? ''

          const titles = dayNotes
            .filter((n) => isNoteworthyMood(n.mood))
            .map((n) => n.title || plainText(n.content).slice(0, 60))
            .filter(Boolean)
          const img = dayNotes.flatMap((n) =>
            (n.images || []).map((fn) => fileUrl(n, fn, { thumb: '80x80' })),
          )[0]

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => navigate(`/web/day/${cell.key}`)}
              className={
                'group relative flex min-h-[128px] flex-col gap-1.5 p-2.5 text-left transition ' +
                (cell.inMonth ? 'bg-cream' : 'bg-cream/40') +
                (isToday ? ' ring-2 ring-inset ring-ink/40' : '') +
                ' hover:bg-tag'
              }
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 font-serif text-base font-semibold leading-none"
                  style={
                    has
                      ? { backgroundColor: moodColor(mood), color: moodTextColor(mood) }
                      : {
                          color: isWeekend
                            ? 'var(--color-weekend)'
                            : cell.inMonth
                              ? 'var(--color-ink)'
                              : 'var(--color-ink-soft)',
                        }
                  }
                >
                  {dayNum}
                </span>
                {img && (
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    className="h-7 w-7 rounded-md object-cover"
                  />
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                {titles.slice(0, 3).map((t, i) => (
                  <p
                    key={i}
                    className="truncate text-[12px] font-medium leading-tight text-ink"
                  >
                    {t}
                  </p>
                ))}
                {titles.length > 3 && (
                  <p className="text-[11px] text-ink-soft">
                    +{titles.length - 3}
                  </p>
                )}
              </div>

              {has && !titles.length && (
                <span className="text-[11px] text-ink-soft">
                  {dayNotes.length} {dayNotes.length === 1 ? 'nota' : 'note'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
