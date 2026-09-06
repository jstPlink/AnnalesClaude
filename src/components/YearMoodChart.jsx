import { MONTHS_IT } from '../lib/dates'

// Grafico dell'andamento del mood su un anno: tre linee a granularità
// diversa (giorno/settimana/mese), niente gradiente. Aspetto regolabile per
// adattarsi a mobile (alto, senza valori sull'asse, mesi alterni) e web
// (più basso, con valori sull'asse, tutti i mesi) tramite le props.
// data = risultato di yearWeeklyMood(): { daily, weekly, monthlySeries, hasData }
export default function YearMoodChart({
  data,
  aspectRatio = 0.82, // altezza / larghezza del grafico
  monthFontSize = 22,
  alternateMonths = true, // true = un mese sì e uno no (schermi stretti)
  showAxisValues = false,
}) {
  const W = 1000
  const H = Math.round(W * aspectRatio)
  const padL = showAxisValues ? 56 : 14
  const padR = 12
  const padT = 16
  const padB = 34
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
      {/* Griglia orizzontale, con valori numerici a sinistra solo se richiesti */}
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
          {showAxisValues && (
            <text
              x={padL - 10}
              y={y(m) + 8}
              textAnchor="end"
              fontSize="24"
              fontWeight="600"
              fill="var(--color-ink-soft)"
            >
              {Math.round(m * 100)}
            </text>
          )}
        </g>
      ))}

      {/* Etichette mesi: tutti, oppure alterni sugli schermi stretti */}
      {MONTHS_IT.map(
        (mo, i) =>
          (!alternateMonths || i % 2 === 0) && (
            <text
              key={mo}
              x={x((i + 0.5) / 12)}
              y={H - 10}
              textAnchor="middle"
              fontSize={monthFontSize}
              fontWeight="600"
              fill="var(--color-ink-soft)"
            >
              {mo.slice(0, 3)}
            </text>
          ),
      )}

      {/* Giorno: linea sottile */}
      <path
        d={line(data.daily)}
        fill="none"
        stroke="var(--color-ink-soft)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Settimana: linea media */}
      <path
        d={line(data.weekly)}
        fill="none"
        stroke="#4f8fbf"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Mese: linea spessa */}
      <path
        d={line(data.monthlySeries)}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
