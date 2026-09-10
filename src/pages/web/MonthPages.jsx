import { useMemo } from 'react'
import { fileUrl } from '../../lib/pocketbase'
import { dayMood, moodColor } from '../../lib/mood'
import { plainText, parsePlace } from '../../lib/notes'
import { parseWall, weekdayLong, todayKey } from '../../lib/dates'
import PersonAvatar from '../../components/PersonAvatar'

// "Mano" stabile per una nota: stesso id -> stesso font, sempre.
const HANDS = ['a', 'b', 'c', 'd']
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0
  return ((h % 1e9) + 1e9) % 1e9
}
function handFor(id) {
  return HANDS[hash(id) % HANDS.length]
}
// Inclinazione stabile per chiave, in circa [-spread, +spread] gradi.
function tilt(key, spread) {
  return ((hash(key) % 1000) / 1000) * spread * 2 - spread
}
// PRNG deterministico da un seme (per posizionare i frammenti di sfondo in
// modo stabile per ogni giorno).
function rng(seed) {
  let x = seed % 2147483647
  if (x <= 0) x += 2147483646
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

// Tile OSM che contiene (lat, lon) allo zoom dato, più lo scostamento in px
// per centrare il punto esatto dentro il francobollo (la mappa reale del
// luogo). Un solo tile 256px: leggero e senza chiave API.
function osmTileFor(lat, lon, z) {
  const n = 2 ** z
  const xf = ((lon + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const yf =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  const px = Math.round((xf - Math.floor(xf)) * 256 - 128)
  const py = Math.round((yf - Math.floor(yf)) * 256 - 128)
  return {
    url: `https://tile.openstreetmap.org/${z}/${Math.floor(xf)}/${Math.floor(yf)}.png`,
    pos: `calc(50% - ${px}px) calc(50% - ${py}px)`,
  }
}

// Fascia d'umore -> forma della linguetta + disegnino di sfondo. Le soglie
// seguono gli stop di colore in lib/mood.js (corallo/arancio, giallo, verde,
// blu/viola), così forma e colore della linguetta vanno d'accordo.
function moodKind(value) {
  const m = Number(value)
  if (Number.isNaN(m)) return null
  if (m < 0.3) return 'coral'
  if (m < 0.5) return 'yellow'
  if (m < 0.7) return 'green'
  return 'blue'
}

// Imperfezione stabile della pagina: angolo piegato, strappo o niente.
function flawFor(key) {
  switch (hash(`${key}~flaw`) % 6) {
    case 0:
      return 'dogear-br'
    case 1:
      return 'dogear-tr'
    case 2:
      return 'torn'
    default:
      return ''
  }
}

// Tinte tenui per le targhette dei nomi (sfondo / testo / bordo già abbinati),
// scelte in modo stabile dall'id della persona.
const TAPE_TINTS = [
  { bg: '#d7dee6', ink: '#3f5262', edge: '#8397a6' },
  { bg: '#e7dbc8', ink: '#6b5940', edge: '#a58e6a' },
  { bg: '#dde3cf', ink: '#4f6139', edge: '#8a9c6a' },
  { bg: '#e5d4da', ink: '#6d4f5e', edge: '#a889a0' },
  { bg: '#e6ddc6', ink: '#6a5c3f', edge: '#a89465' },
  { bg: '#dbd7e4', ink: '#4d4762', edge: '#9089ac' },
  { bg: '#cfe0dc', ink: '#3f5f5a', edge: '#7ea6a0' },
  { bg: '#eed7cb', ink: '#7a4f3c', edge: '#c19077' },
  { bg: '#dde2ea', ink: '#4a566c', edge: '#8b98b3' },
  { bg: '#e8dbe0', ink: '#65505f', edge: '#b39cae' },
  { bg: '#d9e2cd', ink: '#556641', edge: '#93a575' },
  { bg: '#e9e0c8', ink: '#6d5f3a', edge: '#b9a874' },
]
function tapeTint(id) {
  return TAPE_TINTS[hash(id) % TAPE_TINTS.length]
}

// Frammenti di testo (pezzi dei titoli delle note) da spargere sfumati sullo
// sfondo, con ~1 su 5 sostituito da una macchia. Posizioni/rotazioni/opacità
// deterministiche per giorno.
function buildScribbles(key, titles) {
  const chunks = []
  for (const t of titles) {
    const parts = (t.text || '').split(/\s+/).filter((w) => w.length > 2)
    for (let i = 0; i < parts.length && chunks.length < 8; i += 2) {
      chunks.push(parts.slice(i, i + 2).join(' '))
    }
  }
  if (!chunks.length) return []
  const r = rng(hash(`${key}~scr`))
  const count = Math.min(6, Math.max(3, chunks.length))
  const out = []
  for (let i = 0; i < count; i += 1) {
    const stain = i > 0 && Math.floor(r() * 5) === 0
    out.push({
      id: i,
      kind: stain ? (r() > 0.5 ? 'stain' : 'blot') : null,
      text: stain ? '' : chunks[i % chunks.length],
      left: `${2 + Math.round(r() * 52)}%`,
      top: `${3 + Math.round(r() * 84)}%`,
      rot: `${(r() * 12 - 6).toFixed(1)}deg`,
      op: (0.07 + r() * 0.09).toFixed(3),
      size: stain ? 34 + Math.round(r() * 20) : 0,
    })
  }
  return out
}

// Vista mese "pagine" (solo web, skin `pages`): ogni giorno del mese è una
// pagina di diario impilata sulla precedente. Linguetta-umore a lato (forma
// per fascia d'umore, lunghezza leggermente variabile), testata oro/rossa,
// titoli in "mani" diverse, disegnini + frammenti di testo a tema sullo
// sfondo, polaroid col nastro (due se ci sono ≥2 foto), etichette coi nomi
// delle persone e, se presenti, un francobollo del luogo e un dischetto CD
// della canzone.
export default function MonthPages({
  grid,
  byDay,
  monthLabel,
  onNavigate,
  peopleById,
  immichUrl,
  immichApiKey,
}) {
  const pages = useMemo(() => {
    return grid
      .filter((c) => c.inMonth)
      .map((c) => {
        const dayNotes = byDay.get(c.key) || []
        const has = dayNotes.length > 0
        const p = parseWall(c.key)
        const wdIdx = p ? new Date(p.y, p.mo - 1, p.d).getDay() : 0
        const mood = has ? dayMood(dayNotes) : null

        // Fino a due fotografie (con didascalia) dalle note del giorno.
        const imgs = []
        for (const n of dayNotes) {
          for (const fn of n.images || []) {
            if (imgs.length >= 2) break
            imgs.push({
              url: fileUrl(n, fn, { thumb: '300x300' }),
              cap: n.title?.trim() || plainText(n.content).slice(0, 24),
            })
          }
          if (imgs.length >= 2) break
        }

        // Persone distinte del giorno, risolte sull'elenco locale.
        const pids = []
        for (const n of dayNotes) {
          for (const id of n.people || []) {
            if (!pids.includes(id)) pids.push(id)
          }
        }
        const people = pids
          .map((id) => peopleById?.get(id))
          .filter(Boolean)

        // Primo luogo (con mappa reale se ha coordinate) e prima canzone
        // (con copertina) del giorno.
        let placeName = ''
        let placeMap = null
        for (const n of dayNotes) {
          const pl = parsePlace(n.place)
          if (pl?.name?.trim()) {
            placeName = pl.name.trim()
            const lat = Number(pl.lat)
            const lon = Number(pl.lon)
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              placeMap = osmTileFor(lat, lon, 13)
            }
            break
          }
        }
        let songCover = null // null = nessuna canzone; '' = canzone senza copertina
        let songTitle = ''
        let songArtist = ''
        for (const n of dayNotes) {
          const s = (n.songs || [])[0]
          if (s) {
            songCover = s.thumbnailUrl || ''
            songTitle = (s.title || '').trim()
            songArtist = (s.artist || '').trim()
            break
          }
        }

        const titles = dayNotes
          .map((n) => ({
            id: n.id,
            text: n.title?.trim() || plainText(n.content).slice(0, 70),
          }))
          .filter((t) => t.text)

        return {
          key: c.key,
          dayNum: p ? p.d : '',
          weekday: weekdayLong(c.key),
          weekend: wdIdx === 0 || wdIdx === 6,
          has,
          count: dayNotes.length,
          mood,
          kind: has ? moodKind(mood) : null,
          flaw: flawFor(c.key),
          isToday: c.key === todayKey(),
          // lunghezza linguetta: base ~58px, casualità ± ~10% (52–64px)
          tw: `${52 + (hash(`${c.key}~tw`) % 13)}px`,
          titles,
          imgs,
          people,
          placeName,
          placeMap,
          songCover,
          songTitle,
          songArtist,
          hasSong: songCover !== null,
          scribbles: has ? buildScribbles(c.key, titles) : [],
        }
      })
  }, [grid, byDay, peopleById])

  return (
    <div className="month-pages">
      <div className="mp-stack">
        {pages.map((pg) => {
          const hasMedia = Boolean(pg.placeName) || pg.hasSong
          return (
            <button
              key={pg.key}
              type="button"
              onClick={() => onNavigate(`/day/${pg.key}`)}
              style={{ '--r': `${tilt(pg.key, 1.3).toFixed(2)}deg` }}
              className={
                'mp-page' +
                (pg.weekend ? ' wknd' : '') +
                (pg.has ? '' : ' is-empty') +
                (pg.isToday ? ' is-today' : '') +
                (pg.imgs.length > 0 ? ' has-photo' : '') +
                (pg.imgs.length > 1 ? ' two-photo' : '') +
                (pg.people.length > 0 ? ' has-tapes' : '') +
                (hasMedia ? ' has-media' : '') +
                (pg.kind ? ` mood-${pg.kind}` : '') +
                (pg.flaw && !pg.isToday ? ` ${pg.flaw}` : '')
              }
              aria-label={
                `${pg.weekday} ${pg.dayNum} ${monthLabel} — ` +
                (pg.has
                  ? `${pg.count} ${pg.count === 1 ? 'nota' : 'note'}`
                  : 'nessuna nota')
              }
            >
              {pg.isToday && (
                <span className="mp-today-tape" aria-hidden="true" />
              )}

              {pg.has && (
                <span
                  className={'mp-tab' + (pg.kind ? ` mp-tab--${pg.kind}` : '')}
                  aria-hidden="true"
                  style={{ '--mp-tab': moodColor(pg.mood), '--mp-tw': pg.tw }}
                >
                  <b>{Math.round(pg.mood * 100)}</b>
                </span>
              )}

              <span className="mp-head">
                <span className="mp-wd">
                  <span className="mp-hl" aria-hidden="true" />
                  {pg.weekday}&nbsp;{pg.dayNum}
                </span>
              </span>

              {pg.titles.length > 0 && (
                <span
                  className="mp-notes"
                  style={{ '--mp-mood': moodColor(pg.mood) }}
                >
                  {pg.titles.map((t) => (
                    <span key={t.id} className="mp-n" data-hand={handFor(t.id)}>
                      {t.text}
                    </span>
                  ))}
                </span>
              )}

              {pg.scribbles.length > 0 && (
                <span className="mp-scribbles" aria-hidden="true">
                  {pg.scribbles.map((s) => (
                    <span
                      key={s.id}
                      className={s.kind || undefined}
                      style={
                        s.kind
                          ? {
                              left: s.left,
                              top: s.top,
                              '--sr': s.rot,
                              '--sw': `${s.size}px`,
                            }
                          : {
                              left: s.left,
                              top: s.top,
                              '--sr': s.rot,
                              '--so': s.op,
                            }
                      }
                    >
                      {s.text}
                    </span>
                  ))}
                </span>
              )}

              {(pg.people.length > 0 || hasMedia) && (
                <span className="mp-side" aria-hidden="true">
                  {pg.people.length > 0 && (
                    <span className="mp-tapes">
                      {pg.people.map((person) => {
                        const tint = tapeTint(person.id)
                        return (
                          <span
                            key={person.id}
                            className="mp-tape"
                            style={{
                              '--mp-tape-bg': tint.bg,
                              '--mp-tape-ink': tint.ink,
                              '--mp-tape-edge': tint.edge,
                            }}
                          >
                            <PersonAvatar
                              person={person}
                              immichUrl={immichUrl}
                              immichApiKey={immichApiKey}
                              size={19}
                            />
                            <span className="mp-tape-name">{person.name}</span>
                          </span>
                        )
                      })}
                    </span>
                  )}

                  {hasMedia && (
                    <span className="mp-place-row">
                      {pg.placeName && (
                        <span className="mp-place">
                          <span
                            className={'mp-map' + (pg.placeMap ? ' real' : '')}
                            style={
                              pg.placeMap
                                ? {
                                    '--map-url': `url(${pg.placeMap.url})`,
                                    '--map-pos': pg.placeMap.pos,
                                  }
                                : undefined
                            }
                          />
                          <span className="mp-place-name">{pg.placeName}</span>
                        </span>
                      )}
                      {pg.hasSong && (
                        <span className="mp-disc-wrap">
                          <span
                            className="mp-disc"
                            style={
                              pg.songCover
                                ? { '--cover': `url(${pg.songCover})` }
                                : undefined
                            }
                          />
                          {(pg.songTitle || pg.songArtist) && (
                            <span className="mp-song">
                              {pg.songTitle && (
                                <span className="t">{pg.songTitle}</span>
                              )}
                              {pg.songArtist && (
                                <span className="a">{pg.songArtist}</span>
                              )}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              )}

              {pg.imgs.length > 0 && (
                <span
                  className={'mp-polas' + (pg.imgs.length > 1 ? ' two' : '')}
                  aria-hidden="true"
                >
                  {pg.imgs.map((im, i) => (
                    <span
                      key={i}
                      className={'mp-pola' + (i === 0 ? ' tc' : '')}
                      style={{
                        '--pr': `${tilt(`${pg.key}p${i}`, 5).toFixed(2)}deg`,
                      }}
                    >
                      <span
                        className="mp-ph"
                        style={{ backgroundImage: `url(${im.url})` }}
                      />
                      {im.cap && <span className="mp-cap">{im.cap}</span>}
                    </span>
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
