import { useEffect, useRef, useState } from 'react'
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
// Sotto questo spostamento (in pixel) un tap sul pallino apre il selettore
// colore; sopra, è un trascinamento che sposta la soglia.
const DRAG_THRESHOLD_PX = 4

function isValidHexArray(v) {
  return (
    Array.isArray(v) && v.length === STOP_LABELS.length && v.every((h) => hexToRgb(h))
  )
}
function isValidPositions(v) {
  if (!Array.isArray(v) || v.length !== STOP_LABELS.length) return false
  if (!Number.isFinite(v[0]) || v[0] < 0) return false
  if (v[v.length - 1] > 1) return false
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

// Editor del gradiente del mood: colori E soglie di tutti e 6 gli stop,
// estremi compresi. Salvato sull'account (campo `moodGradient`), quindi
// vale su tutti i dispositivi. I pallini sopra il gradiente si trascinano
// per spostare la soglia, oppure si toccano (senza trascinare) per aprire
// il selettore colore nativo — il valore sotto è di sola lettura.
export default function MoodGradientControls() {
  const { user } = useAuth()
  const saved = normalize(user?.moodGradient)
  const [colors, setColors] = useState(saved.colors)
  const [positions, setPositions] = useState(saved.positions)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const barRef = useRef(null)
  const colorInputRefs = useRef([])
  const dragRef = useRef(null) // { i, startClientX, moved }

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

  // Sposta la soglia i (0..5, estremi compresi), restando fra le due vicine
  // (o 0/1 per gli estremi) con un margine minimo — così l'ordine non si
  // rompe mai, senza dover validare via HTML min/max dinamici sull'input.
  function setPosition(i, value) {
    setPositions((prev) => {
      const lo = i === 0 ? 0 : prev[i - 1] + MIN_GAP
      const hi = i === prev.length - 1 ? 1 : prev[i + 1] - MIN_GAP
      const clamped = Math.min(hi, Math.max(lo, value))
      return prev.map((p, idx) => (idx === i ? clamped : p))
    })
    setStatus(null)
  }

  function fracFromClientX(clientX) {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  function onHandlePointerDown(i, e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { i, startClientX: e.clientX, moved: false }
  }
  function onHandlePointerMove(i, e) {
    const drag = dragRef.current
    if (!drag || drag.i !== i) return
    if (!drag.moved && Math.abs(e.clientX - drag.startClientX) < DRAG_THRESHOLD_PX) return
    drag.moved = true
    setPosition(i, fracFromClientX(e.clientX))
  }
  function onHandlePointerUp(i) {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.i === i && !drag.moved) {
      // Tap senza trascinamento: apre il selettore colore nativo.
      colorInputRefs.current[i]?.click()
    }
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
        (barra del mood, pagine del mese, statistiche). Trascina un pallino
        per spostarne la soglia, toccalo senza trascinare per cambiarne il
        colore. Valgono su tutti i tuoi dispositivi.
      </p>

      {/* Gradiente + pallini trascinabili, posizionati sulla propria soglia:
          un tocco (senza trascinamento) apre il selettore colore nativo. */}
      <div className="relative py-3">
        <div
          ref={barRef}
          className="h-6 w-full rounded-full border border-line-soft"
          style={{ background: gradientCss(colors, positions) }}
        />
        <div className="absolute inset-x-0 top-0 h-full">
          {colors.map((h, i) => (
            <div
              key={i}
              onPointerDown={(e) => onHandlePointerDown(i, e)}
              onPointerMove={(e) => onHandlePointerMove(i, e)}
              onPointerUp={() => onHandlePointerUp(i)}
              className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-cream shadow-md transition active:scale-95 active:cursor-grabbing"
              style={{ left: `${positions[i] * 100}%`, backgroundColor: h }}
              title={`${STOP_LABELS[i]} — trascina per spostare, tocca per cambiare colore`}
            >
              <input
                ref={(el) => {
                  colorInputRefs.current[i] = el
                }}
                type="color"
                value={h}
                onChange={(e) => setColor(i, e.target.value)}
                className="h-0 w-0 opacity-0"
                tabIndex={-1}
                aria-label={`Colore per "${STOP_LABELS[i]}"`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Valore di ogni soglia: sola lettura (si sposta trascinando il
          pallino sopra, non scrivendo un numero). */}
      <div className="grid grid-cols-3 gap-2">
        {STOP_LABELS.map((label, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 rounded-xl border border-line bg-cream px-2 py-1.5"
          >
            <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
              {label}
            </span>
            <span className="text-sm font-bold tabular-nums text-ink">
              {Math.round(positions[i] * 100)}%
            </span>
          </div>
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
