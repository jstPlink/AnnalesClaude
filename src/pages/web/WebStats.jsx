import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNav } from '../../context/NavContext'
import { listNotesInRange, countAllNotes, describeError } from '../../lib/notes'
import { listPeople } from '../../lib/people'
import { listTags } from '../../lib/tags'
import { computeYearStats } from '../../lib/stats'
import { moodColor, moodTextColor } from '../../lib/mood'
import { dayMonthLabel } from '../../lib/dates'

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

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-tag p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-3xl font-semibold text-ink">
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-sm text-ink-soft">{sub}</p>}
    </div>
  )
}

function DayRow({ day, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
        style={{ backgroundColor: moodColor(day.mood), color: moodTextColor(day.mood) }}
      >
        {Math.round(day.mood * 100)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">
          {dayMonthLabel(day.key)}
        </span>
        <span className="block text-xs text-ink-soft">
          {day.count} {day.count === 1 ? 'nota' : 'note'}
        </span>
      </span>
    </button>
  )
}

export default function WebStats() {
  const navigate = useNavigate()
  const { cursor, setCursor } = useNav()
  const year = cursor.year
  const [yearNotes, setYearNotes] = useState([])
  const [allTimeCount, setAllTimeCount] = useState(null)
  const [people, setPeople] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [notes, total, ppl, tgs] = await Promise.all([
        listNotesInRange({
          start: `${year}-01-01 00:00:00.000Z`,
          end: `${year}-12-31 23:59:59.999Z`,
        }),
        countAllNotes(),
        listPeople(),
        listTags(),
      ])
      setYearNotes(notes)
      setAllTimeCount(total)
      setPeople(ppl)
      setTags(tgs)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(
    () => computeYearStats(yearNotes, { allPeople: people, allTags: tags }),
    [yearNotes, people, tags],
  )

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
            Statistiche
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Note totali" value={allTimeCount ?? '—'} />
        <StatCard label={`Note nel ${year}`} value={stats.noteCount} />
        <StatCard
          label="Mood medio"
          value={stats.avgMood != null ? Math.round(stats.avgMood * 100) : '—'}
        />
        <StatCard
          label="Giorno più pieno"
          value={stats.busiestDay ? stats.busiestDay.count : '—'}
          sub={stats.busiestDay ? dayMonthLabel(stats.busiestDay.key) : ''}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {stats.topDays.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Giorni migliori
            </p>
            <div className="space-y-2">
              {stats.topDays.map((d) => (
                <DayRow key={d.key} day={d} onClick={() => navigate(`/day/${d.key}`)} />
              ))}
            </div>
          </section>
        )}

        {stats.bottomDays.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Giorni più difficili
            </p>
            <div className="space-y-2">
              {stats.bottomDays.map((d) => (
                <DayRow key={d.key} day={d} onClick={() => navigate(`/day/${d.key}`)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {(stats.topPerson || stats.topTag || stats.topPlace) && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.topPerson && (
            <StatCard
              label="Persona più presente"
              value={stats.topPerson.name}
              sub={`in ${stats.topPerson.count} note`}
            />
          )}
          {stats.topTag && (
            <StatCard
              label="Tag più usato"
              value={stats.topTag.name}
              sub={`in ${stats.topTag.count} note`}
            />
          )}
          {stats.topPlace && (
            <StatCard
              label="Luogo più frequente"
              value={stats.topPlace.name}
              sub={`in ${stats.topPlace.count} note`}
            />
          )}
        </div>
      )}

      {!loading && !stats.noteCount && (
        <p className="py-16 text-center text-ink-soft">Nessuna nota nel {year}.</p>
      )}
    </div>
  )
}
