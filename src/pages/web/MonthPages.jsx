import { useMemo } from 'react'
import { fileUrl } from '../../lib/pocketbase'
import { dayMood, moodColor, moodTextColor } from '../../lib/mood'
import { plainText } from '../../lib/notes'
import { parseWall, weekdayLong } from '../../lib/dates'

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
  return (hash(key) % 1000) / 1000 * spread * 2 - spread
}

// Vista mese "pagine" (solo web, skin `pages`): ogni giorno del mese è una
// pagina di diario impilata sulla precedente. Linguetta-umore a sinistra,
// testata rossa nei weekend, titoli in "mani" diverse, polaroid col nastro
// per i giorni con foto. Ogni pagina apre la vista giorno.
export default function MonthPages({ grid, byDay, monthLabel, onNavigate }) {
  const pages = useMemo(() => {
    return grid
      .filter((c) => c.inMonth)
      .map((c) => {
        const dayNotes = byDay.get(c.key) || []
        const has = dayNotes.length > 0
        const p = parseWall(c.key)
        const wdIdx = p ? new Date(p.y, p.mo - 1, p.d).getDay() : 0
        const imgNote = dayNotes.find((n) => (n.images || []).length > 0)
        const imgCount = dayNotes.reduce(
          (s, n) => s + (n.images ? n.images.length : 0),
          0,
        )
        return {
          key: c.key,
          dayNum: p ? p.d : '',
          weekday: weekdayLong(c.key),
          weekend: wdIdx === 0 || wdIdx === 6,
          has,
          count: dayNotes.length,
          mood: has ? dayMood(dayNotes) : null,
          titles: dayNotes
            .map((n) => ({
              id: n.id,
              text: n.title?.trim() || plainText(n.content).slice(0, 70),
            }))
            .filter((t) => t.text),
          img: imgNote
            ? fileUrl(imgNote, imgNote.images[0], { thumb: '300x300' })
            : null,
          imgCount,
          cap: imgNote
            ? imgNote.title?.trim() || plainText(imgNote.content).slice(0, 24)
            : '',
        }
      })
  }, [grid, byDay])

  return (
    <div className="month-pages">
      <div className="mp-stack">
        {pages.map((pg) => (
          <button
            key={pg.key}
            type="button"
            onClick={() => onNavigate(`/day/${pg.key}`)}
            style={{ '--r': `${tilt(pg.key, 0.7).toFixed(2)}deg` }}
            className={
              'mp-page' +
              (pg.weekend ? ' wknd' : '') +
              (pg.has ? '' : ' is-empty') +
              (pg.img ? ' has-photo' : '')
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
                className="mp-tab"
                aria-hidden="true"
                style={{ '--mp-tab': moodColor(pg.mood), color: moodTextColor(pg.mood) }}
              >
                <b>{Math.round(pg.mood * 100)}</b>
                <i>umore</i>
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

            {pg.img && (
              <span
                className={'mp-pola' + (pg.imgCount > 1 ? ' is-stack' : '')}
                aria-hidden="true"
                style={{ '--pr': `${tilt(pg.key + 'p', 6).toFixed(2)}deg` }}
              >
                <span
                  className="mp-ph"
                  style={{ backgroundImage: `url(${pg.img})` }}
                />
                {pg.cap && <span className="mp-cap">{pg.cap}</span>}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
