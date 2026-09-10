import { useMemo } from 'react'
import { fileUrl } from '../../lib/pocketbase'
import { dayMood, moodColor, moodTextColor } from '../../lib/mood'
import { plainText } from '../../lib/notes'
import { parseWall, weekdayLong } from '../../lib/dates'
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
  { bg: '#d7dee6', ink: '#4a5c6c', edge: '#9fb0bd' },
  { bg: '#e6dccb', ink: '#6b5940', edge: '#c3ad8c' },
  { bg: '#dde3cf', ink: '#586841', edge: '#aebd93' },
  { bg: '#e3d5dc', ink: '#6d4f5e', edge: '#c0a3b1' },
  { bg: '#e5ddc9', ink: '#6a5c3f', edge: '#c1b189' },
  { bg: '#dcd8e2', ink: '#544e63', edge: '#b3acc0' },
]
function tapeTint(id) {
  return TAPE_TINTS[hash(id) % TAPE_TINTS.length]
}

// Vista mese "pagine" (solo web, skin `pages`): ogni giorno del mese è una
// pagina di diario impilata sulla precedente. Linguetta-umore a lato (con
// forma diversa per fascia d'umore), testata rossa nei weekend, titoli in
// "mani" diverse, disegnini a tema umore accennati sul foglio, polaroid col
// nastro per i giorni con foto (due affiancate se ci sono almeno due
// fotografie) ed etichette di nastro coi nomi delle persone del giorno.
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

        // Persone distinte del giorno (max 3), risolte sull'elenco locale.
        const pids = []
        for (const n of dayNotes) {
          for (const id of n.people || []) {
            if (!pids.includes(id)) pids.push(id)
          }
        }
        const people = pids
          .map((id) => peopleById?.get(id))
          .filter(Boolean)
          .slice(0, 3)

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
          titles: dayNotes
            .map((n) => ({
              id: n.id,
              text: n.title?.trim() || plainText(n.content).slice(0, 70),
            }))
            .filter((t) => t.text),
          imgs,
          people,
        }
      })
  }, [grid, byDay, peopleById])

  return (
    <div className="month-pages">
      <div className="mp-stack">
        {pages.map((pg) => (
          <button
            key={pg.key}
            type="button"
            onClick={() => onNavigate(`/day/${pg.key}`)}
            style={{ '--r': `${tilt(pg.key, 1.3).toFixed(2)}deg` }}
            className={
              'mp-page' +
              (pg.weekend ? ' wknd' : '') +
              (pg.has ? '' : ' is-empty') +
              (pg.imgs.length > 0 ? ' has-photo' : '') +
              (pg.imgs.length > 1 ? ' two-photo' : '') +
              (pg.people.length > 0 ? ' has-tapes' : '') +
              (pg.kind ? ` mood-${pg.kind}` : '') +
              (pg.flaw ? ` ${pg.flaw}` : '')
            }
            aria-label={
              `${pg.weekday} ${pg.dayNum} ${monthLabel} — ` +
              (pg.has
                ? `${pg.count} ${pg.count === 1 ? 'nota' : 'note'}`
                : 'nessuna nota')
            }
          >
            {pg.has ? (
              <span
                className={'mp-tab' + (pg.kind ? ` mp-tab--${pg.kind}` : '')}
                aria-hidden="true"
                style={{ '--mp-tab': moodColor(pg.mood), color: moodTextColor(pg.mood) }}
              >
                <b>{Math.round(pg.mood * 100)}</b>
              </span>
            ) : (
              <span className="mp-tab is-empty" aria-hidden="true">
                <b>·</b>
              </span>
            )}

            <span className="mp-head">
              <span className="mp-wd">
                <span className="mp-hl" aria-hidden="true" />
                {pg.weekday}&nbsp;{pg.dayNum}
              </span>
              {pg.has && (
                <span className="mp-cnt">
                  {pg.count} {pg.count === 1 ? 'nota' : 'note'}
                </span>
              )}
            </span>

            {pg.titles.length > 0 ? (
              <span className="mp-notes">
                {pg.titles.map((t) => (
                  <span key={t.id} className="mp-n" data-hand={handFor(t.id)}>
                    {t.text}
                  </span>
                ))}
              </span>
            ) : (
              <span className="mp-empty">niente di segnato</span>
            )}

            {pg.people.length > 0 && (
              <span className="mp-tapes" aria-hidden="true">
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
                        size={20}
                      />
                      <span className="mp-tape-name">{person.name}</span>
                    </span>
                  )
                })}
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
                    style={{ '--pr': `${tilt(`${pg.key}p${i}`, 5).toFixed(2)}deg` }}
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
        ))}
      </div>
    </div>
  )
}
