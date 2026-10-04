import { MONTHS_IT } from '../lib/dates'

// Grafico dell'andamento del mood su un anno: tre linee a granularità
// diversa (giorno/settimana/mese), niente gradiente. Aspetto regolabile per
// adattarsi a mobile (alto, senza valori sull'asse, mesi alterni) e web
// (più basso, con valori sull'asse, tutti i mesi) tramite le props.
//
// Lo sfondo a QUADRETTI è disegnato qui dentro, nello stesso SVG, e non più in
// CSS: così scala insieme al grafico e i quadretti coincidono con gli assi.
// Il lato del quadretto è 1/24 della larghezza utile (2 quadretti per mese, le
// etichette dei mesi stanno su una linea verticale); l'altezza utile è un
// multiplo del lato (`gridRows`, multiplo di 4) così le righe 0/25/50/75/100
// cadono esattamente su una linea orizzontale. Quadretti quadrati: l'altezza
// del grafico segue da lì (prima si fissava il rapporto altezza/larghezza).
// data = risultato di yearWeeklyMood(): { daily, weekly, monthlySeries, hasData }
// `bare` e `lineColors` esistono solo per la skin "Pagine" (WebData.jsx: il
// cartoncino/bordo diventano lo sfondo a quadretti del chiamante, e le 3
// linee un altro colore) — di default il componente resta quello di sempre.
export default function YearMoodChart({
  data,
  gridRows = 20, // righe di quadretti (multiplo di 4): più righe = grafico più alto
  monthFontSize = 22,
  axisFontSize = 24,
  fontFamily, // senza valore: eredita il font di default (mobile, invariato)
  fontWeight = 600,
  alternateMonths = true, // true = un mese sì e uno no (schermi stretti)
  showAxisValues = false,
  bare = false,
  lineColors = {
    day: 'var(--color-ink-soft)',
    week: '#4f8fbf',
    month: 'var(--color-ink)',
  },
}) {
  const W = 1000
  const padL = showAxisValues ? 56 : 14
  const padR = 12
  const padT = 16
  const padB = 34
  const innerW = W - padL - padR
  const cols = 24 // 2 quadretti per mese
  const cell = innerW / cols
  const innerH = cell * gridRows
  const H = Math.round(padT + innerH + padB)

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
      <div
        className={
          'flex items-center justify-center px-4 py-16 text-sm text-ink-soft ' +
          (bare ? '' : 'rounded-2xl border border-line bg-tag')
        }
      >
        Nessun dato per quest'anno.
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      className={bare ? '' : 'rounded-2xl border border-line bg-tag'}
    >
      {/* Sfondo a quadretti: linee verticali e orizzontali ogni `cell`, dentro l'area del grafico */}
      <g stroke="rgba(79, 143, 191, 0.14)" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {Array.from({ length: cols + 1 }, (_, i) => (
          <line key={'v' + i} x1={padL + i * cell} x2={padL + i * cell} y1={padT} y2={padT + innerH} vectorEffect="non-scaling-stroke" />
        ))}
        {Array.from({ length: gridRows + 1 }, (_, j) => (
          <line key={'h' + j} x1={padL} x2={padL + innerW} y1={padT + j * cell} y2={padT + j * cell} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {/* Assi verticali: un tratto più marcato a inizio di ogni mese */}
      <g stroke="rgba(79, 143, 191, 0.3)" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {Array.from({ length: 13 }, (_, i) => (
          <line key={'m' + i} x1={x(i / 12)} x2={x(i / 12)} y1={padT} y2={padT + innerH} vectorEffect="non-scaling-stroke" />
        ))}
      </g>

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
              fontSize={axisFontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
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
              fontFamily={fontFamily}
              fontWeight={fontWeight}
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
        stroke={lineColors.day}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Settimana: linea media */}
      <path
        d={line(data.weekly)}
        fill="none"
        stroke={lineColors.week}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Mese: linea spessa */}
      <path
        d={line(data.monthlySeries)}
        fill="none"
        stroke={lineColors.month}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
