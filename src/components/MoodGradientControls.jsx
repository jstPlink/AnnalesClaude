import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { pb } from '../lib/pocketbase'
import { describeError } from '../lib/notes'
import {
  DEFAULT_STOP_POSITIONS,
  DEFAULT_MOOD_HEX,
  hexToRgb,
  setMoodGradient,
} from '../lib/mood'

// Etichette dei 6 stop, nell'ordine delle posizioni.
const STOP_LABELS = ['Pessimo', 'Giù', 'Sotto la media', 'Sopra la media', 'Bene', 'Ottimo']
// Distanza minima fra due soglie vicine, perché il gradiente non degeneri.
const MIN_GAP = 0.03

function isValidHexArray(v) {
  return (
    Array.isArray(v) && v.length === STOP_LABELS.length && v.every((h) => hexToRgb(h))
  )
}
function isValidPositions(v) {
  if (!Array.isArray(v) || v.length !== STOP_LABELS.length) return false
  if (v[0] !== 0 || v[v.length - 1] !== 1) return false
  for (let i = 1; i < v.length; i++) {
    if (!(Number.isFinite(v[i]) && v[i] > v[i - 1])) return false
  }
  return true
}

// Normalizza il valore grezzo salvato sull'account (`user.moodGradient`) in
// `{ colors, positions }`: gestisce sia il formato storico (solo un array di
// 6 esadecimali, soglie predefinite) sia quello attuale.
function normalize(saved) {
  if (isValidHexArray(saved)) {
    return { colors: saved, positions: DEFAULT_STOP_POSITIONS.slice() }
  }
  if (saved && isValidHexArray(saved.colors) && isValidPositions(saved.positions)) {
    return { colors: saved.colors, positions: saved.positions }
  }
  return { colors: DEFAULT_MOOD_HEX, positions: DEFAULT_STOP_POSITIONS.slice() }
}

function gradientCss(colors, positions) {
  const stops = colors.map((h, i) => `${h} ${Math.round(positions[i] * 100)}%`)
  return `linear-gradient(to right, ${stops.join(', ')})`
}

// Editor del gradiente del mood: colori E soglie dei 4 stop interni (gli
// estremi, 0 e 1, restano fissi). Salvato sull'account (campo
// `moodGradient`), quindi vale su tutti i dispositivi. Gli slot colorati
// sono cliccabili direttamente sopra il gradiente (aprono il selettore
// colore nativo, posizionati sulla propria soglia) — niente più legenda
// separata sotto.
export default function MoodGradientControls() {
  const { user } = useAuth()
  const saved = normalize(user?.moodGradient)
  const [colors, setColors] = useState(saved.colors)
  const [positions, setPositions] = useState(saved.positions)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  // Riallinea se l'utente (quindi il gradiente salvato) cambia da fuori.
  useEffect(() => {
    const n = normalize(user?.moodGradient)
    setColors(n.colors)
    setPositions(n.positions)
  }, [user])

  const isDefault =
    colors.every((h, i) => h.toLowerCase() === DEFAULT_MOOD_HEX[i].toLowerCase()) &&
    positions.every((p, i) => p === DEFAULT_STOP_POSITIONS[i])
  const isSaved =
    colors.every((h, i) => h.toLowerCase() === saved.colors[i].toLowerCase()) &&
    positions.every((p, i) => p === saved.positions[i])

  function setColor(i, value) {
    setColors((prev) => prev.map((h, idx) => (idx === i ? value : h)))
    setStatus(null)
  }

  // Sposta la soglia interna i (1..4), restando fra le due vicine con un
  // margine minimo — così l'ordine e gli estremi fissi (0 e 1) non si rompono
  // mai, senza dover validare via HTML min/max dinamici sull'input.
  function setPosition(i, value) {
    setPositions((prev) => {
      const lo = prev[i - 1] + MIN_GAP
      const hi = prev[i + 1] - MIN_GAP
      const clamped = Math.min(hi, Math.max(lo, value))
      return prev.map((p, idx) => (idx === i ? clamped : p))
    })
    setStatus(null)
  }

  async function save(nextColors = colors, nextPositions = positions) {
    if (!user?.id || busy) return
    setBusy(true)
    setStatus(null)
    const custom =
      nextColors.some((h, i) => h.toLowerCase() !== DEFAULT_MOOD_HEX[i].toLowerCase()) ||
      nextPositions.some((p, i) => p !== DEFAULT_STOP_POSITIONS[i])
    const value = custom ? { colors: nextColors, positions: nextPositions } : null
    try {
      await pb.collection('users').update(user.id, { moodGradient: value })
      setMoodGradient(value)
      setStatus({ ok: true, message: 'Salvato.' })
    } catch (err) {
      setStatus({ ok: false, message: describeError(err) })
    } finally {
      setBusy(false)
    }
  }

  function resetToDefault() {
    setColors(DEFAULT_MOOD_HEX)
    setPositions(DEFAULT_STOP_POSITIONS.slice())
    save(DEFAULT_MOOD_HEX, DEFAULT_STOP_POSITIONS.slice())
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-soft">
        I colori e le soglie con cui l’app rappresenta l’umore delle note
        (barra del mood, pagine del mese, statistiche). Tocca un pallino per
        cambiarne il colore; i 4 numeri sotto spostano le soglie intermedie
        (gli estremi, “pessimo” e “ottimo”, restano fissi). Valgono su tutti i
        tuoi dispositivi.
      </p>

      {/* Gradiente + slot colorati cliccabili, posizionati sulla propria
          soglia: tocca un pallino per aprire il selettore colore nativo. */}
      <div className="relative py-3">
        <div
          className="h-6 w-full rounded-full border border-line-soft"
          style={{ background: gradientCss(colors, positions) }}
        />
        <div className="absolute inset-x-0 top-0 h-full">
          {colors.map((h, i) => (
            <label
              key={i}
              className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-cream shadow-md transition active:scale-95"
              style={{ left: `${positions[i] * 100}%`, backgroundColor: h }}
              title={`${STOP_LABELS[i]} — tocca per cambiare colore`}
            >
              <input
                type="color"
                value={h}
                onChange={(e) => setColor(i, e.target.value)}
                className="h-0 w-0 opacity-0"
                aria-label={`Colore per "${STOP_LABELS[i]}"`}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Soglie dei 4 stop interni (gli estremi sono fissi a 0 e 100) */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <label
            key={i}
            className="flex flex-col gap-1 rounded-xl border border-line bg-cream px-2 py-1.5"
          >
            <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
              {STOP_LABELS[i]}
            </span>
            <span className="flex items-center gap-0.5">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(positions[i] * 100)}
                onChange={(e) => setPosition(i, Number(e.target.value) / 100)}
                className="w-full min-w-0 rounded-lg border border-line-soft bg-tag px-1.5 py-1 text-sm font-bold tabular-nums text-ink"
                aria-label={`Soglia per "${STOP_LABELS[i]}" (percento)`}
              />
              <span className="text-xs text-ink-soft">%</span>
            </span>
          </label>
        ))}
      </div>

      {status && (
        <p
          className={
            'text-xs ' + (status.ok ? 'text-save-dark' : 'text-delete-dark')
          }
        >
          {status.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => save()}
          disabled={busy || isSaved}
          className="rounded-full border border-save-dark bg-save px-4 py-2 text-xs font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? 'Salvo…' : 'Salva'}
        </button>
        <button
          type="button"
          onClick={resetToDefault}
          disabled={busy || isDefault}
          className="rounded-full border border-line bg-cream px-4 py-2 text-xs font-bold text-ink transition hover:bg-tag disabled:opacity-50"
        >
          Ripristina predefinito
        </button>
      </div>
    </div>
  )
}
