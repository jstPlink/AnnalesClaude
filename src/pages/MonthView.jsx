import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import YearPill from '../components/YearPill'
import MoodBar from '../components/MoodBar'
import ImageCarousel from '../components/ImageCarousel'
import CircleButton from '../components/CircleButton'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import {
  listNotesInRange,
  groupByDay,
  describeError,
  parsePeople,
} from '../lib/notes'
import { averageMood, MOOD_TITLE_THRESHOLD } from '../lib/mood'
import { fileUrl } from '../lib/pocketbase'
import {
  MONTHS_IT,
  addMonths,
  isWeekend,
  monthRange,
  parseWall,
  todayKey,
  weekdayShort,
} from '../lib/dates'

const SWIPE_THRESHOLD = 55

export default function MonthView() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const today = new Date()
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dir, setDir] = useState(0) // -1 / 1: direzione ultima transizione

  const load = useCallback(async ({ year, month }) => {
    setLoading(true)
    setError('')
    try {
      const list = await listNotesInRange(monthRange(year, month))
      setNotes(list)
    } catch (err) {
      setError(describeError(err))
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(cursor)
  }, [cursor, load])

  const go = useCallback((delta) => {
    setDir(delta)
    setCursor((c) => addMonths(c, delta))
  }, [])

  // Navigazione tra mesi via swipe orizzontale (niente frecce).
  const drag = useRef(null)
  function onPointerDown(e) {
    drag.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerUp(e) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    drag.current = null
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const days = useMemo(() => {
    const grouped = groupByDay(notes)
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, dayNotes]) => {
        const images = dayNotes.flatMap((n) =>
          (n.images || []).map((fn) => ({
            url: fileUrl(n, fn, { thumb: '200x200' }),
            alt: n.title || '',
          })),
        )
        const titles = dayNotes
          .filter((n) => Number(n.mood) > MOOD_TITLE_THRESHOLD)
          .map((n) => n.title)
          .filter(Boolean)
        return {
          key,
          dayNum: parseWall(key)?.d ?? '',
          weekday: weekdayShort(key),
          weekend: isWeekend(key),
          avgMood: averageMood(dayNotes),
          titles,
          people: [
            ...new Set(dayNotes.flatMap((n) => parsePeople(n.people))),
          ],
          images,
        }
      })
  }, [notes])

  return (
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="grid grid-cols-[3rem_1fr_3rem] items-center px-4 pb-3">
          <span />
          <div className="flex justify-center">
            <YearPill
              year={cursor.year}
              onChange={(year) => {
                setDir(0)
                setCursor((c) => ({ ...c, year }))
              }}
            />
          </div>
          <div className="flex justify-end">
            <CircleButton size={40} variant="light" onClick={logout} title="Esci">
              <Icon name="logout" size={18} />
            </CircleButton>
          </div>
        </div>

        <div
          className="select-none pb-3 text-center"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <h2 className="text-2xl font-extrabold text-ink">
            {MONTHS_IT[cursor.month]}
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            scorri lateralmente per cambiare mese
          </p>
        </div>
      </header>

      <main
        key={`${cursor.year}-${cursor.month}`}
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{
          touchAction: 'pan-y',
          animation: `${dir < 0 ? 'slideInLeft' : dir > 0 ? 'slideInRight' : 'fadeIn'} .18s ease-out`,
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {error && (
          <p className="m-4 rounded-2xl bg-delete/10 px-4 py-3 text-sm text-delete-dark">
            {error}
          </p>
        )}

        {loading && !notes.length && (
          <p className="p-8 text-center text-ink-soft">Carico…</p>
        )}

        {!loading && !error && !days.length && (
          <p className="p-10 text-center text-ink-soft">
            Nessuna nota in {MONTHS_IT[cursor.month]} {cursor.year}.
          </p>
        )}

        <ul className="divide-y divide-line-soft">
          {days.map((d) => (
            <li key={d.key}>
              <button
                type="button"
                onClick={() => navigate(`/day/${d.key}`)}
                className="flex w-full items-stretch gap-3 px-3 py-3 text-left transition active:bg-panel"
              >
                <div
                  className={
                    'flex w-11 shrink-0 flex-col items-center justify-center ' +
                    (d.weekend ? 'text-weekend' : 'text-ink')
                  }
                >
                  <span className="text-2xl font-extrabold leading-none">
                    {d.dayNum}
                  </span>
                  <span className="mt-1 text-xs font-semibold lowercase">
                    {d.weekday}
                  </span>
                </div>

                <MoodBar value={d.avgMood} />

                <div className="min-w-0 flex-1 self-center">
                  {d.titles.length > 0 ? (
                    <ul className="space-y-0.5">
                      {d.titles.map((t, i) => (
                        <li
                          key={i}
                          className="truncate text-[15px] font-medium text-ink"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm italic text-ink-soft/70">
                      {d.people.length ? d.people.join(', ') : '—'}
                    </span>
                  )}
                  {d.titles.length > 0 && d.people.length > 0 && (
                    <p className="mt-1 truncate text-xs text-ink-soft">
                      {d.people.join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex w-[72px] shrink-0 items-center justify-end">
                  <ImageCarousel images={d.images} size={64} />
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="h-4" />
      </main>

      <Footer
        primaryIcon="plus"
        primaryTitle="Nuova nota (oggi)"
        onPrimary={() => navigate(`/note/new?date=${todayKey()}`)}
      />
    </PhoneShell>
  )
}
