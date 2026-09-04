import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  listNotesInRange,
  describeError,
  plainText,
} from '../../lib/notes'
import { moodColor } from '../../lib/mood'
import { fileUrl } from '../../lib/pocketbase'
import {
  dayRange,
  durationMinutes,
  fullDayLabel,
  parseWall,
  timeLabel,
} from '../../lib/dates'

const DAY_MIN = 24 * 60
const MIN_BLOCK = 52

function startMinutes(v) {
  const p = parseWall(v)
  return p ? p.h * 60 + p.mi : 0
}

function withLanes(items) {
  const laneEnd = []
  const placed = items.map((it) => {
    let lane = laneEnd.findIndex((e) => e <= it.startMin)
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

export default function WebDay() {
  const { date } = useParams()
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const trackRef = useRef(null)
  const [trackH, setTrackH] = useState(0)

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

  // Misura l'altezza disponibile per la fascia oraria: tutto il giorno deve
  // stare in una schermata, senza scorrimento della pagina.
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => setTrackH(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const blocks = useMemo(() => {
    const items = notes.map((n) => {
      const s = Math.max(0, Math.min(DAY_MIN, startMinutes(n.timeStart)))
      const dur = durationMinutes(n.timeStart, n.timeEnd) || 30
      return { note: n, startMin: s, endMin: Math.min(DAY_MIN, s + dur) }
    })
    return withLanes(items)
  }, [notes])

  const pxPerMin = trackH / DAY_MIN

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="mb-4 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Torna al mese
        </button>
        <div className="flex items-end justify-between">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
            {fullDayLabel(date)}
          </h1>
          <button
            type="button"
            onClick={() => navigate(`/note/new?date=${date}`)}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream transition hover:brightness-110"
          >
            + Nuova nota
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 shrink-0 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex-1 py-16 text-center text-ink-soft">Carico…</p>
      ) : !notes.length ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-line text-center">
          <p className="text-ink-soft">Nessuna nota per questo giorno.</p>
          <button
            type="button"
            onClick={() => navigate(`/note/new?date=${date}`)}
            className="mt-4 rounded-full border border-line bg-tag px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-cream"
          >
            Crea la prima nota
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-line bg-sand/40 p-4">
          <div ref={trackRef} className="relative h-full">
            {/* Righe e ore */}
            {Array.from({ length: 25 }, (_, i) => {
              const top = i * 60 * pxPerMin
              return (
                <div
                  key={i}
                  className="absolute left-0 right-0 flex items-start"
                  style={{ top }}
                >
                  <span className="w-14 shrink-0 -translate-y-2 text-right text-xs font-semibold tabular-nums text-ink-soft">
                    {String(i).padStart(2, '0')}:00
                  </span>
                  <span className="mt-[1px] h-px flex-1 bg-line/70" />
                </div>
              )
            })}

            {/* Note */}
            <div className="absolute inset-y-0" style={{ left: 64, right: 8 }}>
              {trackH > 0 &&
                blocks.map(({ note: n, startMin, endMin, lane, lanes }) => {
                  const top = startMin * pxPerMin
                  const height = Math.max(MIN_BLOCK, (endMin - startMin) * pxPerMin)
                  const widthPct = 100 / lanes
                  const img = n.images?.[0]
                  const preview = height >= 70 ? plainText(n.content) : ''
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => navigate(`/note/${n.id}`)}
                      className="absolute flex overflow-hidden rounded-2xl border border-line bg-tag text-left shadow-sm transition hover:-translate-y-px hover:shadow-md"
                      style={{
                        top,
                        height,
                        left: `calc(${lane * widthPct}% + ${lane ? 6 : 0}px)`,
                        width: `calc(${widthPct}% - ${lanes > 1 ? 6 : 0}px)`,
                      }}
                    >
                      <span
                        className="w-1.5 shrink-0"
                        style={{ backgroundColor: moodColor(n.mood) }}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
                        <span className="text-xs font-semibold tabular-nums text-ink-soft">
                          {timeLabel(n.timeStart)} – {timeLabel(n.timeEnd)}
                        </span>
                        <span className="truncate font-serif text-[17px] font-semibold text-ink">
                          {n.title || 'Senza titolo'}
                        </span>
                        {preview && (
                          <span className="line-clamp-3 text-[13px] leading-snug text-ink-soft">
                            {preview}
                          </span>
                        )}
                      </span>
                      {img && (
                        <img
                          src={fileUrl(n, img, { thumb: '200x200' })}
                          alt=""
                          loading="lazy"
                          className="m-2 h-[calc(100%-1rem)] w-24 shrink-0 self-center rounded-xl object-cover"
                        />
                      )}
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
