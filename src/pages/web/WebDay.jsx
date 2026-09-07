import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import MarqueeText from '../../components/MarqueeText'
import ImageCarousel from '../../components/ImageCarousel'
import {
  listNotesInRange,
  describeError,
  plainText,
} from '../../lib/notes'
import { moodColor, moodTextColor } from '../../lib/mood'
import { fileUrl } from '../../lib/pocketbase'
import {
  addDaysKey,
  dayRange,
  durationMinutes,
  fullDayLabel,
  parseWall,
  timeLabel,
} from '../../lib/dates'

// Stessa logica della vista giorno mobile (src/pages/DayView.jsx): l'intera
// giornata (24h) viene compressa per stare tutta nell'altezza disponibile
// sullo schermo, senza dover scorrere la pagina per vedere le note più
// tarde. La larghezza della colonna (sul wrapper più sotto) è la stessa
// delle righe della vista mese (WebMonth), centrata nella pagina.
const DAY_MIN = 24 * 60
const RAIL_W = 48 // px, larghezza della barra oraria a sinistra
const MIN_BLOCK = 30 // px, altezza minima di un blocco nota

function startMinutes(value) {
  const p = parseWall(value)
  return p ? p.h * 60 + p.mi : 0
}

// Anteprima del contenuto: riempie lo spazio rimasto sotto il titolo e, se il
// testo non ci sta, sfuma verso il basso terminando con "…" (stessa logica
// della vista giorno mobile).
function ClampedPreview({ text }) {
  const ref = useRef(null)
  const [clamped, setClamped] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])

  return (
    <span className="relative min-h-0 flex-1 overflow-hidden">
      <span
        ref={ref}
        className="block h-full overflow-hidden text-[13px] leading-snug text-ink-soft"
      >
        {text}
      </span>
      {clamped && (
        <>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-tag to-transparent" />
          <span className="pointer-events-none absolute bottom-0 right-0 text-[13px] leading-snug text-ink-soft">
            …
          </span>
        </>
      )}
    </span>
  )
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

  const go = useCallback(
    (delta) => navigate(`/day/${addDaysKey(date, delta)}`),
    [navigate, date],
  )
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  // Misura l'altezza disponibile per la fascia oraria (deve stare tutta in
  // una schermata, come su mobile).
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => setTrackH(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading, notes.length])

  const blocks = useMemo(() => {
    const items = notes.map((n) => {
      const startMin = Math.max(0, Math.min(DAY_MIN, startMinutes(n.timeStart)))
      const dur = durationMinutes(n.timeStart, n.timeEnd)
      const endMin = Math.min(DAY_MIN, startMin + (dur || 0))
      // URL immagini precalcolati (riferimento stabile: il carosello non si
      // resetta a ogni render della vista).
      const images = (n.images || []).map((fn) => ({
        url: fileUrl(n, fn, { thumb: '400x400' }),
      }))
      return { note: n, startMin, endMin, images }
    })
    return withLanes(items)
  }, [notes])

  const pxPerMin = trackH / DAY_MIN

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-3/5 flex-col">
      <header className="mb-4 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-3 flex items-center gap-2 text-base font-bold text-ink-soft transition hover:text-ink"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Torna al mese
        </button>
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Giorno precedente"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-tag hover:text-ink"
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <h1 className="min-w-0 truncate font-serif text-3xl font-semibold tracking-tight text-ink">
              {fullDayLabel(date)}
            </h1>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Giorno successivo"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-tag hover:text-ink"
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/note/new?date=${date}`)}
            className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream transition hover:brightness-110"
          >
            + Nuova nota
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-3 shrink-0 rounded-2xl bg-delete/15 px-4 py-3 text-sm text-delete-dark">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-line bg-panel p-4">
        {loading ? (
          <p className="flex h-full items-center justify-center text-ink-soft">Carico…</p>
        ) : !notes.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-ink-soft">Nessuna nota per questo giorno.</p>
            <button
              type="button"
              onClick={() => navigate(`/note/new?date=${date}`)}
              className="rounded-full border border-line bg-tag px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-cream"
            >
              Crea la prima nota
            </button>
          </div>
        ) : (
          <div ref={trackRef} className="relative h-full">
            {/* Barra oraria: una riga per ogni ora, estesa da qui fino al
                bordo opposto della pagina (dietro alle note, quando ce ne
                sono), etichetta ogni 3 ore. */}
            <div className="absolute inset-0">
              {Array.from({ length: 25 }, (_, h) => {
                const top = h * 60 * pxPerMin
                const label = h % 3 === 0 && h < 24
                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 flex items-start"
                    style={{ top }}
                  >
                    <span
                      className="shrink-0 -translate-y-2 text-right text-xs font-semibold tabular-nums text-ink-soft"
                      style={{ width: RAIL_W }}
                    >
                      {label ? `${String(h).padStart(2, '0')}:00` : ''}
                    </span>
                    <span className="mt-[1px] h-px flex-1 bg-line/70" />
                  </div>
                )
              })}
            </div>

            {/* Note posizionate sull'asse temporale */}
            <div className="absolute inset-y-0 right-0" style={{ left: RAIL_W + 14 }}>
              {trackH > 0 &&
                blocks.map(({ note: n, startMin, endMin, lane, lanes, images }) => {
                  const top = startMin * pxPerMin
                  const rawH = (endMin - startMin) * pxPerMin
                  const h = Math.max(MIN_BLOCK, rawH)
                  const widthPct = 100 / lanes
                  const tiny = h < 40
                  const img = images[0]
                  const preview = h >= 70 ? plainText(n.content) : ''
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => navigate(`/note/${n.id}`)}
                      className="absolute overflow-hidden rounded-xl border border-line bg-tag text-left shadow-sm transition hover:-translate-y-px hover:shadow-md"
                      style={{
                        top,
                        height: h,
                        left: `calc(${lane * widthPct}% + ${lane ? 6 : 0}px)`,
                        width: `calc(${widthPct}% - ${lanes > 1 ? 6 : 0}px)`,
                      }}
                    >
                      {tiny ? (
                        <span
                          className="block h-full w-full"
                          style={{ backgroundColor: moodColor(n.mood) }}
                        />
                      ) : (
                        <span className="flex h-full w-full">
                          {/* Orario di inizio/fine avvolto dal colore del mood */}
                          <span
                            className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-xs font-bold tabular-nums"
                            style={{
                              backgroundColor: moodColor(n.mood),
                              color: moodTextColor(n.mood),
                            }}
                          >
                            <span>{timeLabel(n.timeStart)}</span>
                            <span>{timeLabel(n.timeEnd)}</span>
                          </span>

                          <span className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <MarqueeText className="min-w-0 flex-1 shrink font-serif text-[15px] font-semibold leading-tight text-ink">
                                {n.title || (
                                  <span className="italic text-ink-soft">Senza titolo</span>
                                )}
                              </MarqueeText>
                              {n.people?.length > 0 && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-cream px-2 py-0.5 text-[10px] font-bold tabular-nums text-ink">
                                  <Icon name="user" size={11} strokeWidth={3} />
                                  {n.people.length}
                                </span>
                              )}
                            </span>
                            {preview && <ClampedPreview text={preview} />}
                          </span>

                          {/* Immagine a larghezza fissa, sempre a destra, a
                              tutta altezza. Con più foto: carosello. */}
                          {img && h >= 52 && (
                            images.length > 1 ? (
                              <ImageCarousel
                                images={images}
                                width={96}
                                height={h}
                                rounded=""
                              />
                            ) : (
                              <img
                                src={img.url}
                                alt=""
                                loading="lazy"
                                className="h-full w-24 shrink-0 bg-panel-2 object-cover"
                              />
                            )
                          )}
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
