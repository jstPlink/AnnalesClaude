import { MONTHS_IT } from '../lib/dates'
import { moodColor } from '../lib/mood'

// Grafico dell'andamento del mood su un anno.
// data = risultato di yearWeeklyMood(): { points, filled, smooth, trend, hasData }
export default function YearMoodChart({ data }) {
  const W = 1000
  const H = 380
  const padL = 40
  const padR = 12
  const padT = 14
  const padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const x = (t) => padL + t * innerW
  const y = (m) => padT + (1 - m) * innerH

  const line = (arr) => {
    if (!arr) return ''
    let d = ''
    let pen = false
    arr.forEach((v, i) => {
      if (v == null) {
        pen = false
        return
      }
      const px = x((i + 0.5) / arr.length)
      const py = y(v)
      d += `${pen ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)} `
      pen = true
    })
    return d.trim()
  }

  const area = (arr) => {
    if (!arr) return ''
    const pts = arr
      .map((v, i) => (v == null ? null : [x((i + 0.5) / arr.length), y(v)]))
      .filter(Boolean)
    if (pts.length < 2) return ''
    const top = pts
      .map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`)
      .join(' ')
    return `${top} L${pts.at(-1)[0].toFixed(1)} ${y(0).toFixed(1)} L${pts[0][0].toFixed(1)} ${y(0).toFixed(1)} Z`
  }

  if (!data?.hasData) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-line bg-tag px-4 py-16 text-sm text-ink-soft">
        Nessun dato per quest'anno.
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      className="rounded-2xl border border-line bg-tag"
    >
      <defs>
        <linearGradient id="ymc-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e0655e" />
          <stop offset="0.2" stopColor="#e79a4d" />
          <stop offset="0.4" stopColor="#e6cf5c" />
          <stop offset="0.6" stopColor="#a6d06e" />
          <stop offset="0.8" stopColor="#5ea9d6" />
          <stop offset="1" stopColor="#8b8fd6" />
        </linearGradient>
      </defs>

      {/* Griglia orizzontale + etichette 0..100 */}
      {[0, 0.25, 0.5, 0.75, 1].map((m) => (
        <g key={m}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(m)}
            y2={y(m)}
            stroke="var(--color-line)"
            strokeWidth="1"
            strokeDasharray={m === 0.5 ? '' : '3 4'}
            opacity={m === 0.5 ? 0.9 : 0.5}
          />
          <text
            x={padL - 6}
            y={y(m) + 3}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-ink-soft)"
          >
            {Math.round(m * 100)}
          </text>
        </g>
      ))}

      {/* Etichette mesi */}
      {MONTHS_IT.map((mo, i) => (
        <text
          key={mo}
          x={x((i + 0.5) / 12)}
          y={H - 8}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-ink-soft)"
        >
          {mo.slice(0, 3)}
        </text>
      ))}

      {/* Area sotto la tendenza, colorata come la scala mood */}
      <path d={area(data.trend)} fill="url(#ymc-grad)" opacity="0.16" />

      {/* Settimane grezze: spezzata sottile + puntini */}
      <path
        d={line(data.points.map((p) => p.mood))}
        fill="none"
        stroke="var(--color-ink-soft)"
        strokeWidth="1.2"
        opacity="0.4"
      />
      {data.points.map(
        (p) =>
          p.mood != null && (
            <circle
              key={p.i}
              cx={x((p.i + 0.5) / 48)}
              cy={y(p.mood)}
              r="2.6"
              fill={moodColor(p.mood)}
              stroke="var(--color-tag)"
              strokeWidth="1"
            />
          ),
      )}

      {/* Lisciata */}
      <path
        d={line(data.smooth)}
        fill="none"
        stroke="#4f8fbf"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Tendenza */}
      <path
        d={line(data.trend)}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
