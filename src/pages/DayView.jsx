import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

const DAY_MIN = 24 * 60
const RAIL_W = 46 // px, larghezza della barra oraria a sinistra
const MIN_BLOCK = 24 // px, altezza minima di un blocco nota

function startMinutes(value) {
  const p = parseWall(value)
  return p ? p.h * 60 + p.mi : 0
}

// Assegna una "corsia" a note che si sovrappongono nel tempo.
function withLanes(items) {
  const laneEnd = []
  const placed = items.map((it) => {
    let lane = laneEnd.findIndex((end) => end <= it.startMin)
    if (lane === -1) {
      lane = laneEnd.length
      laneEnd.push(it.endMin)
    } else {
      laneEnd[lane] = it.endMin
    }
    return { ...it, lane }
  })
  return placed.map((it) => ({ ...it, lanes: laneEnd.length }))
}

export default function DayView() {
  const { date } = useParams()
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const trackRef = useRef(null)
  const [trackH, setTrackH] = useState(0)

  const parsed = parseWall(date)
  const year = parsed?.y ?? new Date().getFullYear()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listNotesInRange(dayRange(date))
      list.sort((a, b) => startMinutes(a.timeStart) - startMinutes(b.timeStart))
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

  // Misura l'altezza della fascia oraria (deve stare tutto in una schermata).
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => setTrackH(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function changeYear(newYear) {
    if (!parsed) return
    const mm = String(parsed.mo).padStart(2, '0')
    const dd = String(parsed.d).padStart(2, '0')
    navigate(`/day/${newYear}-${mm}-${dd}`)
  }

  const blocks = useMemo(() => {
    const items = notes.map((n) => {
      const startMin = Math.max(0, Math.min(DAY_MIN, startMinutes(n.timeStart)))
      const dur = durationMinutes(n.timeStart, n.timeEnd)
      const endMin = Math.min(DAY_MIN, startMin + (dur || 0))
      return { note: n, startMin, endMin }
    })
    return withLanes(items)
  }, [notes])

  const pxPerMin = trackH / DAY_MIN

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

      <main className="relative flex-1 overflow-hidden px-3 py-3">
        {error && (
          <p className="mb-3 rounded-2xl bg-delete/10 px-4 py-3 text-sm text-delete-dark">
            {error}
          </p>
        )}

        <div ref={trackRef} className="relative h-full w-full">
          {/* Barra oraria: tacchetta ogni ora, etichetta ogni 3 ore */}
          <div
            className="absolute inset-y-0 left-0 border-r border-line"
            style={{ width: RAIL_W }}
          >
            {Array.from({ length: 25 }, (_, h) => {
              const top = h * 60 * pxPerMin
              const label = h % 3 === 0 && h < 24
              return (
                <div key={h}>
                  <span
                    className="absolute right-0 bg-line"
                    style={{
                      top,
                      height: 1,
                      width: label ? 10 : 5,
                    }}
                  />
                  {label && (
                    <span
                      className="absolute right-3 text-[10px] font-semibold tabular-nums text-ink-soft"
                      style={{
                        top: Math.min(Math.max(top - 6, 0), trackH - 12),
                      }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Note posizionate sull'asse temporale */}
          <div
            className="absolute inset-y-0 right-0"
            style={{ left: RAIL_W + 8 }}
          >
            {!loading && !error && !notes.length && (
              <p className="pt-10 text-center text-ink-soft">Nessuna nota</p>
            )}

            {trackH > 0 &&
              blocks.map(({ note: n, startMin, endMin, lane, lanes }) => {
                const top = startMin * pxPerMin
                const rawH = (endMin - startMin) * pxPerMin
                const h = Math.max(MIN_BLOCK, rawH)
                const widthPct = 100 / lanes
                const tiny = h < 34
                const short = h < 62
                const roomy = h > 120 && lanes === 1
                const thumb = roomy && n.images?.[0]
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => navigate(`/note/${n.id}`)}
                    className="absolute overflow-hidden rounded-xl border border-line bg-panel text-left shadow-sm transition active:scale-[0.99]"
                    style={{
                      top,
                      height: h,
                      left: `calc(${lane * widthPct}% + ${lane ? 4 : 0}px)`,
                      width: `calc(${widthPct}% - ${lanes > 1 ? 4 : 0}px)`,
                    }}
                  >
                    {tiny ? (
                      <span
                        className="block h-full w-full"
                        style={{ backgroundColor: moodColor(n.mood) }}
                      />
                    ) : (
                      <span className="flex h-full flex-col px-2 py-1">
                        <span className="text-[11px] font-semibold tabular-nums text-ink-soft">
                          {timeLabel(n.timeStart)}–{timeLabel(n.timeEnd)}
                        </span>
                        {/* Barra mood: sotto l'orario, spessa */}
                        <span
                          className="my-1 h-2 w-full shrink-0 rounded-full"
                          style={{
                            backgroundColor: moodColor(n.mood),
                            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                          }}
                        />
                        {!short && (
                          <span className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-tight text-ink">
                            {n.title || (
                              <span className="italic text-ink-soft">
                                Senza titolo
                              </span>
                            )}
                          </span>
                        )}
                        {short && (
                          <span className="truncate text-[12px] font-semibold text-ink">
                            {n.title || 'Senza titolo'}
                          </span>
                        )}
                        {thumb && (
                          <img
                            src={fileUrl(n, n.images[0], { thumb: '300x300' })}
                            alt=""
                            loading="lazy"
                            className="mt-auto h-16 w-16 self-end rounded-lg bg-panel-2 object-cover"
                          />
                        )}
                      </span>
                    )}
                  </button>
                )
              })}
          </div>
        </div>
      </main>

      <Footer
        primaryIcon="plus"
        primaryTitle="Nuova nota in questo giorno"
        onPrimary={() => navigate(`/note/new?date=${date}`)}
      />
    </PhoneShell>
  )
}
