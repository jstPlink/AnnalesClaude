import { useEffect, useMemo, useRef } from 'react'
import Icon from '../../components/Icon'
import { fileUrl } from '../../lib/pocketbase'
import { dayMood, moodColor, moodTextColor } from '../../lib/mood'
import { plainText } from '../../lib/notes'
import { parseWall } from '../../lib/dates'

// Rotazione stabile per chiave giorno, in circa [-4.5, 4.5] gradi.
function rot(key) {
  let h = 0
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0
  return (((h % 900) + 900) % 900) / 100 - 4.5
}

// Vista mese "bacheca" (solo web, skin `board`): i giorni con qualcosa dentro
// diventano cartoncini appuntati su un pannello di sughero. Un filo rosso
// collega i giorni che condividono una persona o un tag. Il layout è a
// flusso (flex-wrap), non a coordinate fisse: regge un numero qualsiasi di
// giorni. Ogni cartoncino resta cliccabile e porta alla vista giorno.
export default function MonthBoard({ grid, byDay, monthLabel, onNavigate }) {
  const boardRef = useRef(null)
  const svgRef = useRef(null)

  const cards = useMemo(() => {
    return grid
      .filter((c) => c.inMonth && (byDay.get(c.key)?.length ?? 0) > 0)
      .map((c) => {
        const dayNotes = byDay.get(c.key)
        const mood = dayMood(dayNotes)
        const img =
          dayNotes
            .flatMap((n) =>
              (n.images || []).map((fn) => fileUrl(n, fn, { thumb: '300x300' })),
            )
            .find(Boolean) || null
        const people = [...new Set(dayNotes.flatMap((n) => n.people || []))]
        const tags = [...new Set(dayNotes.flatMap((n) => n.tags || []))]
        const hasSong = dayNotes.some(
          (n) => Array.isArray(n.songs) && n.songs.length > 0,
        )
        const titles = dayNotes
          .map((n) => n.title?.trim() || plainText(n.content).slice(0, 60))
          .filter(Boolean)
          .slice(0, 2)
        return {
          key: c.key,
          dayNum: parseWall(c.key)?.d ?? '',
          mood,
          img,
          people,
          tags,
          hasSong,
          titles,
          count: dayNotes.length,
        }
      })
  }, [grid, byDay])

  // Fili: per ogni persona/tag condivisa da 2+ giorni, unisci i giorni
  // consecutivi di quel gruppo. Cap complessivo per non intasare la bacheca.
  const links = useMemo(() => {
    const groups = new Map()
    for (const c of cards) {
      for (const p of c.people) {
        const k = 'p:' + p
        if (!groups.has(k)) groups.set(k, [])
        groups.get(k).push(c.key)
      }
      for (const t of c.tags) {
        const k = 't:' + t
        if (!groups.has(k)) groups.set(k, [])
        groups.get(k).push(c.key)
      }
    }
    const out = []
    const seen = new Set()
    for (const keys of groups.values()) {
      if (keys.length < 2) continue
      for (let i = 0; i < keys.length - 1 && out.length < 16; i += 1) {
        const a = keys[i]
        const b = keys[i + 1]
        const id = a < b ? a + '|' + b : b + '|' + a
        if (seen.has(id)) continue
        seen.add(id)
        out.push([a, b])
      }
    }
    return out
  }, [cards])

  useEffect(() => {
    const board = boardRef.current
    const svg = svgRef.current
    if (!board || !svg) return

    const NS = 'http://www.w3.org/2000/svg'
    const anchor = (key) => {
      const el = board.querySelector(`[data-day="${key}"]`)
      if (!el) return null
      const b = board.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      return [
        r.left - b.left + r.width / 2,
        r.top - b.top + Math.min(26, r.height * 0.18),
      ]
    }

    const draw = () => {
      const bw = board.clientWidth
      const bh = board.clientHeight
      if (!bw || !bh) return
      svg.setAttribute('viewBox', `0 0 ${bw} ${bh}`)
      while (svg.firstChild) svg.removeChild(svg.firstChild)

      for (const [a, z] of links) {
        const pa = anchor(a)
        const pz = anchor(z)
        if (!pa || !pz) continue
        const mx = (pa[0] + pz[0]) / 2
        const my = (pa[1] + pz[1]) / 2
        const dist = Math.hypot(pz[0] - pa[0], pz[1] - pa[1])
        const sag = Math.max(8, Math.min(48, dist * 0.12))
        const d = `M ${pa[0].toFixed(1)} ${pa[1].toFixed(1)} Q ${mx.toFixed(1)} ${(
          my + sag
        ).toFixed(1)} ${pz[0].toFixed(1)} ${pz[1].toFixed(1)}`
        const line = (stroke, w) => {
          const p = document.createElementNS(NS, 'path')
          p.setAttribute('d', d)
          p.setAttribute('fill', 'none')
          p.setAttribute('stroke', stroke)
          p.setAttribute('stroke-width', w)
          p.setAttribute('stroke-linecap', 'round')
          p.setAttribute('filter', 'url(#annales-wob)')
          svg.appendChild(p)
        }
        line('rgba(20,12,6,0.18)', 3.2)
        line('var(--bd-thread)', 2)
        for (const [x, y] of [pa, pz]) {
          const k = document.createElementNS(NS, 'circle')
          k.setAttribute('cx', x)
          k.setAttribute('cy', y)
          k.setAttribute('r', 3.6)
          k.setAttribute('fill', 'var(--bd-thread)')
          k.setAttribute('filter', 'url(#annales-wob)')
          svg.appendChild(k)
        }
      }
    }

    draw()
    let t
    const ro = new ResizeObserver(() => {
      clearTimeout(t)
      t = setTimeout(draw, 100)
    })
    ro.observe(board)
    if (document.fonts?.ready) document.fonts.ready.then(() => setTimeout(draw, 40))
    return () => {
      clearTimeout(t)
      ro.disconnect()
    }
  }, [links, cards])

  if (!cards.length) {
    return (
      <div className="month-board month-board--empty">
        <p>Niente da appuntare a {monthLabel.toLowerCase()}.</p>
      </div>
    )
  }

  return (
    <div ref={boardRef} className="month-board">
      <svg ref={svgRef} className="month-board__threads" aria-hidden="true" />
      {cards.map((c) => (
        <button
          key={c.key}
          type="button"
          data-day={c.key}
          onClick={() => onNavigate(`/day/${c.key}`)}
          style={{ '--r': `${rot(c.key).toFixed(2)}deg` }}
          className={'mb-card ' + (c.img ? 'mb-card--pola' : 'mb-card--note')}
          title={`${c.dayNum} ${monthLabel}`}
        >
          <span className="mb-pin" aria-hidden="true" />

          {c.img ? (
            <>
              <span
                className="mb-photo"
                style={{ backgroundImage: `url(${c.img})` }}
              />
              <span className="mb-cap">
                <b>{c.dayNum}</b>{' '}
                {c.titles[0] ||
                  `${c.count} ${c.count === 1 ? 'nota' : 'note'}`}
              </span>
            </>
          ) : (
            <span className="mb-note-in">
              <span
                className="mb-daynum"
                style={{
                  backgroundColor: moodColor(c.mood),
                  color: moodTextColor(c.mood),
                }}
              >
                {c.dayNum}
              </span>
              <span className="mb-titles">
                {c.titles.length ? (
                  c.titles.map((t, i) => <span key={i}>{t}</span>)
                ) : (
                  <span>
                    {c.count} {c.count === 1 ? 'nota' : 'note'}
                  </span>
                )}
              </span>
            </span>
          )}

          <span className="mb-meta">
            <span
              className="mb-mood"
              style={{
                backgroundColor: moodColor(c.mood),
                color: moodTextColor(c.mood),
              }}
            >
              {Math.round(c.mood * 100)}
            </span>
            {c.people.length > 0 && (
              <span className="mb-chip">
                <Icon name="user" size={11} strokeWidth={2.6} />
                {c.people.length}
              </span>
            )}
            {c.hasSong && (
              <span className="mb-chip">
                <Icon name="music" size={11} strokeWidth={2.6} />
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
