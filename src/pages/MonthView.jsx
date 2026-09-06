import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNav } from '../context/NavContext'
import { useAuth } from '../context/AuthContext'
import PhoneShell from '../components/PhoneShell'
import Footer from '../components/Footer'
import ViewTabs from '../components/ViewTabs'
import YearPill from '../components/YearPill'
import ImageCarousel from '../components/ImageCarousel'
import MarqueeText from '../components/MarqueeText'
import NewNoteWithGeminiSheet from '../components/NewNoteWithGeminiSheet'
import { listNotesInRange, groupByDay, describeError } from '../lib/notes'
import { listPeople } from '../lib/people'
import { listTags } from '../lib/tags'
import { dayMood, moodColor, moodTextColor, isNoteworthyMood } from '../lib/mood'
import { fileUrl } from '../lib/pocketbase'
import {
  MONTHS_IT,
  addMonths,
  isWeekend,
  monthDayKeys,
  monthRange,
  parseWall,
  todayKey,
  weekdayShort,
} from '../lib/dates'

const SWIPE_THRESHOLD = 55

export default function MonthView() {
  const navigate = useNavigate()
  const { cursor, setCursor } = useNav()
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dir, setDir] = useState(0) // -1 / 1: direzione ultima transizione
  const [geminiNoteOpen, setGeminiNoteOpen] = useState(false)
  const [allPeople, setAllPeople] = useState([])
  const [allTags, setAllTags] = useState([])

  useEffect(() => {
    listPeople()
      .then(setAllPeople)
      .catch(() => {})
    listTags()
      .then(setAllTags)
      .catch(() => {})
  }, [])

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

  const todayK = todayKey()

  // Tutti i giorni del mese, con o senza note.
  const days = useMemo(() => {
    const grouped = groupByDay(notes)
    return monthDayKeys(cursor.year, cursor.month).map((key) => {
      const dayNotes = grouped.get(key) || []
      const images = dayNotes.flatMap((n) =>
        (n.images || []).map((fn) => ({
          url: fileUrl(n, fn, { thumb: '200x200' }),
          alt: n.title || '',
        })),
      )
      // Titoli delle note "estreme": mood molto alto o molto basso.
      const titles = dayNotes
        .filter((n) => isNoteworthyMood(n.mood))
        .map((n) => n.title)
        .filter(Boolean)
      return {
        key,
        dayNum: parseWall(key)?.d ?? '',
        weekday: weekdayShort(key),
        weekend: isWeekend(key),
        hasNotes: dayNotes.length > 0,
        avgMood: dayNotes.length ? dayMood(dayNotes) : null,
        titles,
        images,
      }
    })
  }, [notes, cursor.year, cursor.month])

  return (
    <PhoneShell>
      <header className="sticky top-0 z-20 border-b border-line bg-sand pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div
          className="flex min-h-14 select-none items-center justify-center px-4 pb-3"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <YearPill
            year={cursor.year}
            subtitle={MONTHS_IT[cursor.month]}
            layout="row"
            onChange={(year) => {
              setDir(0)
              setCursor((c) => ({ ...c, year }))
            }}
          />
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

        <ul className="divide-y divide-line-soft">
          {days.map((d) => {
            const isToday = d.key === todayK
            return (
              <li key={d.key}>
                <button
                  type="button"
                  onClick={() => navigate(`/day/${d.key}`)}
                  className={
                    'flex w-full items-stretch gap-3 px-3 py-2 text-left transition active:brightness-95 ' +
                    (isToday ? 'bg-tag ' : '') +
                    (d.hasNotes ? '' : 'opacity-55')
                  }
                >
                  {/* Targhetta giorno: sfondo = colore del mood del giorno */}
                  <div
                    className={
                      'flex w-[2.8rem] shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-xl py-2 ' +
                      (d.hasNotes ? '' : 'border border-line-soft')
                    }
                    style={
                      d.hasNotes
                        ? { backgroundColor: moodColor(d.avgMood) }
                        : undefined
                    }
                  >
                    <span
                      className="text-[1.35rem] font-extrabold leading-none"
                      style={{
                        color: d.hasNotes
                          ? moodTextColor(d.avgMood)
                          : d.weekend
                            ? 'var(--color-weekend)'
                            : 'var(--color-ink)',
                      }}
                    >
                      {d.dayNum}
                    </span>
                    {d.weekend ? (
                      <span className="rounded-full bg-weekend px-1.5 text-[10px] font-bold lowercase text-white">
                        {d.weekday}
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold lowercase"
                        style={{
                          color: d.hasNotes
                            ? moodTextColor(d.avgMood)
                            : 'var(--color-ink-soft)',
                        }}
                      >
                        {d.weekday}
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5">
                    {d.titles.map((t, i) => (
                      <MarqueeText
                        key={i}
                        className="text-[15px] font-medium text-ink"
                      >
                        {t}
                      </MarqueeText>
                    ))}
                  </div>

                  <div className="flex w-[88px] shrink-0 items-center justify-end">
                    <ImageCarousel images={d.images} size={84} />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        {loading && !notes.length && (
          <p className="p-6 text-center text-sm text-ink-soft">Carico…</p>
        )}

        <div className="h-4" />
      </main>

      <div className="sticky bottom-0 z-20">
        <ViewTabs active="calendar" />
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
          secondaryIcon="sparkles"
          secondaryTitle="Nuova nota con Gemini"
          onSecondary={() => setGeminiNoteOpen(true)}
        />
      </div>

      <NewNoteWithGeminiSheet
        open={geminiNoteOpen}
        onClose={() => setGeminiNoteOpen(false)}
        apiKey={user?.geminiApiKey?.trim()}
        allPeople={allPeople}
        allTags={allTags}
        onGenerated={(draft) =>
          navigate(`/note/new?date=${todayKey()}`, { state: { aiDraft: draft } })
        }
      />
    </PhoneShell>
  )
}
