import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import YearMoodChart from '../../components/YearMoodChart'
import { useNav } from '../../context/NavContext'
import { listNotesInRange, describeError } from '../../lib/notes'
import { yearWeeklyMood, moodColor, moodTextColor } from '../../lib/mood'
import { MONTHS_IT } from '../../lib/dates'

function WeekBars({ weeks }) {
  return (
    <div className="flex h-14 items-end gap-1.5">
      {weeks.map((w) => (
        <div key={w.week} className="flex h-full flex-1 items-end">
          {w.mood == null ? (
            <div className="h-1 w-full rounded-full bg-line" />
          ) : (
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max(8, w.mood * 100)}%`,
                backgroundColor: moodColor(w.mood),
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function WebData() {
  const navigate = useNavigate()
  const { cursor, setCursor } = useNav()
  const year = cursor.year
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listNotesInRange({
        start: `${year}-01-01 00:00:00.000Z`,
        end: `${year}-12-31 23:59:59.999Z`,
      })
      setNotes(list)
    } catch (err) {
      setError(describeError(err))
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    load()
  }, [load])

  const data = useMemo(() => yearWeeklyMood(year, notes), [year, notes])

  return (
    <div>
      <header className="mb-6 flex items-end justify-between">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
          Andamento <span className="text-ink-soft">{year}</span>
        </h1>
        {loading && <span className="text-sm text-ink-soft">Aggiorno…</span>}
      </header>

      {error && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {error}
        </p>
      )}

      <YearMoodChart data={data} />
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs text-ink-soft">
        <span>● mood settimanale</span>
        <span className="text-[#4f8fbf]">▬ media mobile</span>
        <span className="text-ink">▬ tendenza</span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.monthly.map((m) => (
          <button
            key={m.month}
            type="button"
            onClick={() => {
              setCursor({ year, month: m.month })
              navigate('/')
            }}
            className="rounded-2xl border border-line bg-tag p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg font-semibold text-ink">
                {MONTHS_IT[m.month]}
              </span>
              <span
                className="min-w-[2.5rem] rounded-full px-2 py-0.5 text-center text-sm font-bold tabular-nums"
                style={
                  m.mood == null
                    ? {
                        color: 'var(--color-ink-soft)',
                        border: '1px solid var(--color-line)',
                      }
                    : {
                        backgroundColor: moodColor(m.mood),
                        color: moodTextColor(m.mood),
                      }
                }
              >
                {m.mood == null ? '—' : Math.round(m.mood * 100)}
              </span>
            </div>
            <div className="mt-3">
              <WeekBars weeks={m.weeks} />
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {m.count} {m.count === 1 ? 'nota' : 'note'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
