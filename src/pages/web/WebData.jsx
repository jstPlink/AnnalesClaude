import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import YearMoodChart from '../../components/YearMoodChart'
import Icon from '../../components/Icon'
import { useNav } from '../../context/NavContext'
import { listNotesInRange, describeError } from '../../lib/notes'
import { yearWeeklyMood, moodColor, moodTextColor } from '../../lib/mood'
import { MONTHS_IT } from '../../lib/dates'

// Colori delle 3 linee del grafico nella skin "Pagine": grafite per il
// giorno, penna blu per la settimana, evidenziatore corallo per il mese —
// riprendono due tinte già usate come accento altrove nell'app invece di
// inventarne di nuove.
const CHART_LINE_COLORS = { day: '#a9906e', week: '#5ea9d6', month: '#e0655e' }

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

// Una barretta per ogni giorno del mese.
function WeekBars({ groups }) {
  return (
    <span className="wd-month-bars">
      {groups.map((g, i) =>
        g.mood == null ? (
          <i key={i} style={{ height: '10%', backgroundColor: 'var(--color-line)' }} />
        ) : (
          <i key={i} style={{ height: `${Math.max(10, g.mood * 100)}%`, backgroundColor: moodColor(g.mood) }} />
        ),
      )}
    </span>
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

      <div className="wd-card-wrap">
        <div className="wd-header">
          <Icon name="chart" size={19} />
          <h2>Umore nell'anno</h2>
        </div>
        <div className="wd-card">
          <div className="wd-intro">
            <p>
              Media giornaliera, settimanale e mensile — tocca un mese qui
              sotto per aprirlo.
            </p>
            <div className="wd-legend">
              <span className="wd-chip wd-chip-day">giorno</span>
              <span className="wd-chip wd-chip-week">settimana</span>
              <span className="wd-chip wd-chip-month">mese</span>
            </div>
          </div>
          <div className="wd-chart-body">
            <YearMoodChart
              data={data}
              aspectRatio={0.451}
              monthFontSize={17.6}
              alternateMonths={false}
              showAxisValues
              bare
              lineColors={CHART_LINE_COLORS}
            />
          </div>
        </div>
      </div>

      <div className="wd-card-wrap alt">
        <div className="wd-header">
          <Icon name="calendar" size={19} />
          <h2>Mese per mese</h2>
        </div>
        <div className="wd-card">
          <p className="wd-intro-solo">
            Un biglietto per ogni mese: punteggio medio e andamento dei
            singoli giorni.
          </p>
          <ul>
            {data.monthly.map((m) => (
              <li key={m.month}>
                <button
                  type="button"
                  onClick={() => {
                    setCursor({ year, month: m.month })
                    navigate('/')
                  }}
                  className="wd-month-row"
                >
                  <span className="wd-month-tag">{MONTHS_IT[m.month]}</span>
                  <WeekBars groups={m.groups} />
                  <span
                    className="wd-month-score"
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
        </div>
      </div>
    </div>
  )
}
