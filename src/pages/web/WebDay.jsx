import { useCallback, useEffect, useMemo, useState } from 'react'
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

const PX_PER_MIN = 1.5
const MIN_CARD = 78

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

  const { blocks, fromH, toH } = useMemo(() => {
    if (!notes.length) return { blocks: [], fromH: 8, toH: 20 }
    const items = notes.map((n) => {
      const s = Math.max(0, Math.min(1440, startMinutes(n.timeStart)))
      const dur = durationMinutes(n.timeStart, n.timeEnd) || 30
      return { note: n, startMin: s, endMin: Math.min(1440, s + dur) }
    })
    let lo = Math.floor(Math.min(...items.map((i) => i.startMin)) / 60) - 1
    let hi = Math.ceil(Math.max(...items.map((i) => i.endMin)) / 60) + 1
    lo = Math.max(0, lo)
    hi = Math.min(24, hi)
    if (hi - lo < 6) hi = Math.min(24, lo + 6)
    return { blocks: withLanes(items), fromH: lo, toH: hi }
  }, [notes])

  const originMin = fromH * 60
  const trackH = (toH - fromH) * 60 * PX_PER_MIN

  return (
    <div>
      <header className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/web')}
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
            onClick={() => navigate(`/web/note/new?date=${date}`)}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream transition hover:brightness-110"
          >
            + Nuova nota
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-ink-soft">Carico…</p>
      ) : !notes.length ? (
        <div className="rounded-3xl border border-dashed border-line py-20 text-center">
          <p className="text-ink-soft">Nessuna nota per questo giorno.</p>
          <button
            type="button"
            onClick={() => navigate(`/web/note/new?date=${date}`)}
            className="mt-4 rounded-full border border-line bg-tag px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-cream"
          >
            Crea la prima nota
          </button>
        </div>
      ) : (
        <div
          className="relative rounded-3xl border border-line bg-sand/40 p-4"
          style={{ minHeight: trackH + 32 }}
        >
          <div className="relative" style={{ height: trackH }}>
            {/* Righe e ore */}
            {Array.from({ length: toH - fromH + 1 }, (_, i) => {
              const top = i * 60 * PX_PER_MIN
              return (
                <div
                  key={i}
                  className="absolute left-0 right-0 flex items-start"
                  style={{ top }}
                >
                  <span className="w-14 shrink-0 -translate-y-2 text-right text-xs font-semibold tabular-nums text-ink-soft">
                    {String(fromH + i).padStart(2, '0')}:00
                  </span>
                  <span className="mt-[1px] h-px flex-1 bg-line/70" />
                </div>
              )
            })}

            {/* Note */}
            <div className="absolute inset-y-0" style={{ left: 64, right: 8 }}>
              {blocks.map(({ note: n, startMin, endMin, lane, lanes }) => {
                const top = (startMin - originMin) * PX_PER_MIN
                const height = Math.max(
                  MIN_CARD,
                  (endMin - startMin) * PX_PER_MIN,
                )
                const widthPct = 100 / lanes
                const img = n.images?.[0]
                const preview = plainText(n.content)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => navigate(`/web/note/${n.id}`)}
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
