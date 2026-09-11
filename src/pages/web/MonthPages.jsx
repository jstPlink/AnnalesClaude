import { useMemo } from 'react'
import { fileUrl } from '../../lib/pocketbase'
import { dayMood, moodColor } from '../../lib/mood'
import { plainText, parsePlace } from '../../lib/notes'
import { parseWall, weekdayLong, todayKey } from '../../lib/dates'
import PersonAvatar from '../../components/PersonAvatar'
import Icon from '../../components/Icon'
import {
  hash,
  handFor,
  tilt,
  rng,
  osmTileFor,
  moodKind,
  tapeTint,
  useCarouselIndex,
} from '../../lib/pagesSkin'

// ---- Vista MOBILE: la colonna di persone/luogo/musica/foto della vista
// desktop non ci sta; sul telefono diventano targhette-contatore compatte
// (icona + numero: persone, luoghi distinti, canzoni distinte) fra
// cartoncino e foto, e UNA sola "diapositiva" per le foto, a carosello se
// ce n'è più di una — niente due polaroid sovrapposte: meno realistico ma
// molto più leggibile in poco spazio. ----
function MpMiniBadge({ kind, icon, count }) {
  if (!count) return null
  return (
    <span className={`mp-mini mp-mini--${kind}`} aria-hidden="true">
      <Icon name={icon} size={13} strokeWidth={2.6} />
      <span className="mp-mini-text">{count}</span>
    </span>
  )
}

function MpPolaMobile({ imgs, rotation }) {
  const idx = useCarouselIndex(imgs.length, 3200)
  if (!imgs.length) return null
  return (
    <span className="mp-pola-mobile" style={{ '--pr': rotation }} aria-hidden="true">
      <span className="mp-ph" style={{ backgroundImage: `url(${imgs[idx].url})` }} />
      {imgs.length > 1 && (
        <span className="mp-pola-dots">
          {imgs.map((_, i) => (
            <i key={i} className={i === idx ? 'on' : undefined} />
          ))}
        </span>
      )}
    </span>
  )
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

        // Fino a due fotografie (con didascalia) dalle note del giorno, per
        // le due polaroid affiancate della vista desktop; fino a cinque per
        // il carosello a "diapositiva unica" della vista mobile.
        const imgs = []
        const imgsCarousel = []
        for (const n of dayNotes) {
          for (const fn of n.images || []) {
            if (imgsCarousel.length >= 5) break
            const im = {
              url: fileUrl(n, fn, { thumb: '300x300' }),
              cap: n.title?.trim() || plainText(n.content).slice(0, 24),
            }
            imgsCarousel.push(im)
            if (imgs.length < 2) imgs.push(im)
          }
          if (imgsCarousel.length >= 5) break
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
        // (con copertina) del giorno: per il francobollo/dischetto della
        // vista desktop. In più, tutti i luoghi e le canzoni distinti (fino
        // a 4) per le targhette a carosello della vista mobile.
        let placeName = ''
        let placeMap = null
        const places = []
        for (const n of dayNotes) {
          const pl = parsePlace(n.place)
          const name = pl?.name?.trim()
          if (!name) continue
          if (!placeName) {
            placeName = name
            const lat = Number(pl.lat)
            const lon = Number(pl.lon)
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              placeMap = osmTileFor(lat, lon, 13)
            }
          }
          if (places.length < 4 && !places.includes(name)) places.push(name)
        }
        let songCover = null // null = nessuna canzone; '' = canzone senza copertina
        let songTitle = ''
        let songArtist = ''
        const songs = []
        for (const n of dayNotes) {
          const s = (n.songs || [])[0]
          if (!s) continue
          if (songCover === null) {
            songCover = s.thumbnailUrl || ''
            songTitle = (s.title || '').trim()
            songArtist = (s.artist || '').trim()
          }
          const label = (s.title || s.artist || '').trim()
          if (label && songs.length < 4 && !songs.includes(label)) songs.push(label)
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
          imgsCarousel,
          people,
          placeName,
          placeMap,
          places,
          songCover,
          songTitle,
          songArtist,
          songs,
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

              {/* Cartoncino + (su mobile) targhette e diapositiva foto: un
                  unico contenitore così la vista mobile può affiancarli in
                  riga (cartoncino spostato a sinistra, targhette e foto nello
                  spazio libero). display:contents da desktop: non cambia
                  nulla, la colonna resta quella di sempre. */}
              <span className="mp-notes-row">
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

                {/* Vista mobile: targhette-contatore compatte impilate in
                    verticale fra cartoncino e foto (icona + numero: persone,
                    luoghi distinti, canzoni distinte). Nascoste da desktop. */}
                {(pg.people.length > 0 || pg.places.length > 0 || pg.songs.length > 0) && (
                  <span className="mp-side-mobile">
                    <MpMiniBadge kind="people" icon="user" count={pg.people.length} />
                    <MpMiniBadge kind="place" icon="map-pin" count={pg.places.length} />
                    <MpMiniBadge kind="song" icon="cassette" count={pg.songs.length} />
                  </span>
                )}

                {/* Vista mobile: UNA sola "diapositiva" per le foto, a
                    carosello se ce n'è più di una (niente due polaroid
                    sovrapposte: poco realistico ma molto più leggibile). */}
                <MpPolaMobile
                  imgs={pg.imgsCarousel}
                  rotation={`${tilt(`${pg.key}pm`, 4).toFixed(2)}deg`}
                />
              </span>

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
