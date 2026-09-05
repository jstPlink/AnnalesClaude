import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import ViewTabs from '../components/ViewTabs'
import YearPill from '../components/YearPill'
import YearMoodChart from '../components/YearMoodChart'
import { useNav } from '../context/NavContext'
import { listNotesInRange, describeError } from '../lib/notes'
import { yearWeeklyMood, moodColor, moodTextColor } from '../lib/mood'
import { MONTHS_IT, todayKey } from '../lib/dates'

// Una colonna per coppia di giorni del mese (fino a 16): barrette più
// sottili e numerose, andamento più morbido di quando erano 4 a settimana.
function WeekBars({ groups }) {
  return (
    <div className="flex h-10 w-24 shrink-0 items-end gap-[1.5px]">
      {groups.map((g, i) => (
        <div key={i} className="flex h-full flex-1 items-end">
          {g.mood == null ? (
            <div className="h-[3px] w-full rounded-full bg-line" />
          ) : (
            <div
              className="w-full rounded-t-[2px]"
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

export default function DataView() {
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
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex justify-center px-4 pb-3">
          <YearPill
            year={year}
            onChange={(y) => setCursor((c) => ({ ...c, year: y }))}
          />
        </div>
        <h2 className="pb-3 text-center text-2xl font-extrabold text-ink">
          Andamento
        </h2>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {error && (
          <p className="mb-3 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
            {error}
          </p>
        )}

        {loading && !notes.length ? (
          <p className="py-10 text-center text-ink-soft">Carico…</p>
        ) : (
          <>
            <YearMoodChart data={data} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-ink-soft">
              <span>▬ giorno</span>
              <span className="text-[#4f8fbf]">▬ settimana</span>
              <span className="text-ink">▬ mese</span>
            </div>

            <ul className="mt-5 divide-y divide-line-soft">
              {data.monthly.map((m) => (
                <li key={m.month}>
                  <button
                    type="button"
                    onClick={() => {
                      setCursor({ year, month: m.month })
                      navigate('/')
                    }}
                    className="flex w-full items-center gap-3 py-2.5 text-left transition active:bg-panel"
                  >
                    <span className="w-16 shrink-0 text-sm font-semibold text-ink">
                      {MONTHS_IT[m.month].slice(0, 3)}
                    </span>
                    <WeekBars groups={m.groups} />
                    <span className="flex-1" />
                    <span
                      className="min-w-[2.75rem] rounded-full px-2 py-1 text-center text-sm font-bold tabular-nums"
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
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <div className="sticky bottom-0 z-20">
        <ViewTabs active="data" />
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
