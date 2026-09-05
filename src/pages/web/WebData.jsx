import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import YearMoodChart from '../../components/YearMoodChart'
import { useNav } from '../../context/NavContext'
import { listNotesInRange, describeError } from '../../lib/notes'
import { yearWeeklyMood, moodColor, moodTextColor } from '../../lib/mood'
import { MONTHS_IT } from '../../lib/dates'

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

// Una colonna per coppia di giorni del mese (fino a 16): barrette più
// sottili e numerose, andamento più morbido di quando erano 4 a settimana.
function WeekBars({ groups }) {
  return (
    <div className="flex h-14 items-end gap-[1.5px]">
      {groups.map((g, i) => (
        <div key={i} className="flex h-full flex-1 items-end">
          {g.mood == null ? (
            <div className="h-1 w-full rounded-full bg-line" />
          ) : (
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max(8, g.mood * 100)}%`,
                backgroundColor: moodColor(g.mood),
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
            Andamento
          </h1>
          <NavArrow
            dir="left"
            label="Anno precedente"
            onClick={() => setCursor((c) => ({ ...c, year: c.year - 1 }))}
          />
          <span className="w-14 text-center font-serif text-2xl font-semibold text-ink-soft">
            {year}
          </span>
          <NavArrow
            dir="right"
            label="Anno successivo"
            onClick={() => setCursor((c) => ({ ...c, year: c.year + 1 }))}
          />
        </div>
        {loading && <span className="text-sm text-ink-soft">Aggiorno…</span>}
      </header>

      {error && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {error}
        </p>
      )}

      <YearMoodChart data={data} />
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs text-ink-soft">
        <span>▬ giorno</span>
        <span className="text-[#4f8fbf]">▬ settimana</span>
        <span className="text-ink">▬ mese</span>
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
              <WeekBars groups={m.groups} />
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
