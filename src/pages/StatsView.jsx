import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import ViewTabs from '../components/ViewTabs'
import YearPill from '../components/YearPill'
import { useNav } from '../context/NavContext'
import { listNotesInRange, countAllNotes, describeError } from '../lib/notes'
import { listPeople } from '../lib/people'
import { listTags } from '../lib/tags'
import { computeYearStats } from '../lib/stats'
import { moodColor, moodTextColor } from '../lib/mood'
import { dayMonthLabel, todayKey } from '../lib/dates'

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-tag p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-2xl font-semibold text-ink">
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-soft">{sub}</p>}
    </div>
  )
}

function DayRow({ day, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-line-soft bg-panel px-3 py-2.5 text-left transition active:brightness-95"
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

export default function StatsView() {
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
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex justify-center px-4 pb-3">
          <YearPill
            year={year}
            onChange={(y) => setCursor((c) => ({ ...c, year: y }))}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {error && (
          <p className="mb-3 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
            {error}
          </p>
        )}

        {loading && !yearNotes.length ? (
          <p className="py-10 text-center text-ink-soft">Carico…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
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

            {stats.topDays.length > 0 && (
              <section className="mt-5">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Giorni migliori
                </p>
                <div className="space-y-2">
                  {stats.topDays.map((d) => (
                    <DayRow
                      key={d.key}
                      day={d}
                      onClick={() => navigate(`/day/${d.key}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {stats.bottomDays.length > 0 && (
              <section className="mt-5">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Giorni più difficili
                </p>
                <div className="space-y-2">
                  {stats.bottomDays.map((d) => (
                    <DayRow
                      key={d.key}
                      day={d}
                      onClick={() => navigate(`/day/${d.key}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {(stats.topPerson || stats.topTag || stats.topPlace) && (
              <section className="mt-5 space-y-3">
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
              </section>
            )}

            {!stats.noteCount && (
              <p className="py-10 text-center text-ink-soft">
                Nessuna nota nel {year}.
              </p>
            )}
          </>
        )}
      </main>

      <div className="sticky bottom-0 z-20">
        <ViewTabs active="stats" />
        <Footer
          sticky={false}
          items={[
            {
              icon: 'settings',
              title: 'Opzioni',
              onClick: () => navigate('/profilo'),
            },
            {
              icon: 'search',
              title: 'Filtri',
              onClick: () => navigate('/filtri'),
            },
          ]}
          primaryIcon="plus"
          primaryTitle="Nuova nota (oggi)"
          onPrimary={() => navigate(`/note/new?date=${todayKey()}`)}
        />
      </div>
    </PhoneShell>
  )
}
