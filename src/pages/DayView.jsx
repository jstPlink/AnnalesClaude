import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import YearPill from '../components/YearPill'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import { listNotesInRange, describeError } from '../lib/notes'
import { fileUrl } from '../lib/pocketbase'
import { moodColor } from '../lib/mood'
import {
  dayMonthLabel,
  dayRange,
  durationMinutes,
  parseWall,
  timeLabel,
} from '../lib/dates'

const DAY_MINUTES = 24 * 60

// Altezza di un blocco nota, proporzionale alla durata rispetto alle 24 ore.
function blockHeight(note) {
  const ratio = durationMinutes(note.timeStart, note.timeEnd) / DAY_MINUTES
  return Math.min(560, Math.max(66, Math.round(ratio * 1400)))
}

export default function DayView() {
  const { date } = useParams()
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const parsed = parseWall(date)
  const year = parsed?.y ?? new Date().getFullYear()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listNotesInRange(dayRange(date))
      list.sort((a, b) =>
        String(a.timeStart).localeCompare(String(b.timeStart)),
      )
      setNotes(list)
    } catch (err) {
      setError(describeError(err))
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  function changeYear(newYear) {
    if (!parsed) return
    const mm = String(parsed.mo).padStart(2, '0')
    const dd = String(parsed.d).padStart(2, '0')
    navigate(`/day/${newYear}-${mm}-${dd}`)
  }

  return (
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="grid grid-cols-[3rem_1fr_3rem] items-center px-4 pb-3">
          <CircleButton size={40} onClick={() => navigate('/')} title="Indietro">
            <Icon name="chevron-left" size={20} />
          </CircleButton>
          <div className="flex justify-center">
            <YearPill year={year} onChange={changeYear} />
          </div>
          <span />
        </div>
        <h2 className="pb-3 text-center text-2xl font-extrabold text-ink">
          {dayMonthLabel(date)}
        </h2>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-3">
        {error && (
          <p className="mb-3 rounded-2xl bg-delete/10 px-4 py-3 text-sm text-delete-dark">
            {error}
          </p>
        )}

        {loading && <p className="p-8 text-center text-ink-soft">Carico…</p>}

        {!loading && !error && !notes.length && (
          <p className="p-10 text-center text-ink-soft">Nessuna nota</p>
        )}

        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => navigate(`/note/${n.id}`)}
                style={{ height: blockHeight(n) }}
                className="flex w-full overflow-hidden rounded-2xl border border-line bg-panel text-left shadow-sm transition active:scale-[0.99]"
              >
                <span
                  className="w-2 shrink-0"
                  style={{ backgroundColor: moodColor(n.mood) }}
                />
                <span className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-r border-line-soft text-xs font-semibold text-ink-soft">
                  <span>{timeLabel(n.timeStart)}</span>
                  <span>{timeLabel(n.timeEnd)}</span>
                </span>
                <span className="flex min-w-0 flex-1 items-center px-3">
                  <span className="line-clamp-3 text-[15px] font-semibold text-ink">
                    {n.title || <span className="italic text-ink-soft">Senza titolo</span>}
                  </span>
                </span>
                {n.images?.[0] && (
                  <span className="m-2 flex shrink-0 items-center self-center">
                    <img
                      src={fileUrl(n, n.images[0], { thumb: '300x300' })}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 rounded-xl bg-panel-2 object-cover"
                    />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </main>

      <Footer
        primaryIcon="plus"
        primaryTitle="Nuova nota in questo giorno"
        onPrimary={() => navigate(`/note/new?date=${date}`)}
      />
    </PhoneShell>
  )
}
