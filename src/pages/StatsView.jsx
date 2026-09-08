import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import ViewTabs from '../components/ViewTabs'
import YearPill from '../components/YearPill'
import RecapCard from '../components/RecapCard'
import CountUp from '../components/CountUp'
import Skeleton from '../components/Skeleton'
import PersonAvatar from '../components/PersonAvatar'
import { useNav } from '../context/NavContext'
import { useAuth } from '../context/AuthContext'
import { listNotesInRange, countAllNotes, describeError } from '../lib/notes'
import { listPeople } from '../lib/people'
import { listTags } from '../lib/tags'
import { computeYearStats } from '../lib/stats'
import { moodColor, moodTextColor } from '../lib/mood'
import { MONTHS_IT, dayMonthLabel, parseWall, todayKey } from '../lib/dates'

// "3 set" da una chiave YYYY-MM-DD (per gli intervalli compatti).
function shortDM(key) {
  const p = parseWall(key)
  return p ? `${p.d} ${MONTHS_IT[p.mo - 1].slice(0, 3).toLowerCase()}` : ''
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-tag p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-2xl font-semibold text-ink">
        <CountUp value={value} />
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-soft">{sub}</p>}
    </div>
  )
}

function DayRow({ day, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className="anim-row flex w-full items-center gap-3 rounded-2xl border border-line-soft bg-panel px-3 py-2.5 text-left transition active:brightness-95"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
        style={{ backgroundColor: moodColor(day.mood), color: moodTextColor(day.mood) }}
      >
        {Math.round(day.mood * 100)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {dayMonthLabel(day.key)}
        </span>
        <span className="block truncate text-xs text-ink-soft">
          {day.titles?.length
            ? day.titles.join(' · ')
            : `${day.count} ${day.count === 1 ? 'nota' : 'note'}`}
        </span>
      </span>
    </button>
  )
}

export default function StatsView() {
  const navigate = useNavigate()
  const { cursor, setCursor } = useNav()
  const { user } = useAuth()
  const geminiApiKey = user?.geminiApiKey?.trim()
  const immichUrl = user?.immichUrl?.trim()
  const immichApiKey = user?.immichApiKey?.trim()
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

      <main className="anim-page flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {error && (
          <p className="mb-3 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
            {error}
          </p>
        )}

        {loading && !yearNotes.length ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-line bg-tag p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-7 w-14" />
              </div>
            ))}
          </div>
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

            <RecapCard
              label={String(year)}
              notes={yearNotes}
              apiKey={geminiApiKey}
              className="mt-5"
            />

            {stats.topPeople.length > 0 && (
              <section className="mt-5">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Persone più presenti
                </p>
                <ol className="space-y-1.5">
                  {stats.topPeople.map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-line bg-cream px-3 py-2"
                    >
                      <span className="w-4 shrink-0 text-xs font-bold tabular-nums text-ink-soft">
                        {i + 1}
                      </span>
                      <PersonAvatar
                        person={p.person || { name: p.name }}
                        immichUrl={immichUrl}
                        immichApiKey={immichApiKey}
                        size={28}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {p.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                        {p.count} {p.count === 1 ? 'nota' : 'note'}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {stats.topDays.length > 0 && (
              <section className="mt-5">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Giorni migliori
                </p>
                <div className="space-y-2">
                  {stats.topDays.map((d, i) => (
                    <DayRow
                      key={d.key}
                      day={d}
                      style={{ '--i': i }}
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
                  {stats.bottomDays.map((d, i) => (
                    <DayRow
                      key={d.key}
                      day={d}
                      style={{ '--i': i }}
                      onClick={() => navigate(`/day/${d.key}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {(stats.bestWeek ||
              stats.bestWeekday ||
              stats.topTag ||
              stats.topPlace) && (
              <section className="mt-5 space-y-3">
                {stats.bestWeek && (
                  <StatCard
                    label="Settimana migliore"
                    value={`${shortDM(stats.bestWeek.first)} – ${shortDM(stats.bestWeek.last)}`}
                    sub={`mood ${Math.round(stats.bestWeek.mood * 100)} · ${stats.bestWeek.notes} note`}
                  />
                )}
                {stats.bestWeekday && (
                  <StatCard
                    label="Giorno più su di morale"
                    value={stats.bestWeekday.name}
                    sub={`mood medio ${Math.round(stats.bestWeekday.mood * 100)} su ${stats.bestWeekday.count} ${stats.bestWeekday.count === 1 ? 'giorno' : 'giorni'}`}
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
