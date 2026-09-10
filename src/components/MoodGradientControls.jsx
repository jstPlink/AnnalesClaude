import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { pb } from '../lib/pocketbase'
import { describeError } from '../lib/notes'
import {
  MOOD_STOP_POSITIONS,
  DEFAULT_MOOD_HEX,
  hexToRgb,
  setMoodGradient,
} from '../lib/mood'

// Etichette dei 6 stop (posizioni fisse: vedi MOOD_STOP_POSITIONS).
const STOP_LABELS = ['Pessimo', 'Giù', 'Sotto la media', 'Sopra la media', 'Bene', 'Ottimo']

function isValidHexArray(v) {
  return (
    Array.isArray(v) &&
    v.length === MOOD_STOP_POSITIONS.length &&
    v.every((h) => hexToRgb(h))
  )
}

function gradientCss(hex) {
  const stops = hex.map(
    (h, i) => `${h} ${Math.round(MOOD_STOP_POSITIONS[i] * 100)}%`,
  )
  return `linear-gradient(to right, ${stops.join(', ')})`
}

// Editor dei colori del gradiente del mood. Salvato sull'account
// (campo `moodGradient`), quindi vale su tutti i dispositivi. Le posizioni
// degli stop sono fisse; si personalizzano solo i colori.
export default function MoodGradientControls() {
  const { user } = useAuth()
  const saved = isValidHexArray(user?.moodGradient)
    ? user.moodGradient
    : DEFAULT_MOOD_HEX
  const [hex, setHex] = useState(saved)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  // Riallinea se l'utente (quindi il gradiente salvato) cambia da fuori.
  useEffect(() => {
    setHex(
      isValidHexArray(user?.moodGradient) ? user.moodGradient : DEFAULT_MOOD_HEX,
    )
  }, [user])

  const isDefault = hex.every(
    (h, i) => h.toLowerCase() === DEFAULT_MOOD_HEX[i].toLowerCase(),
  )
  const isSaved = hex.every(
    (h, i) => h.toLowerCase() === saved[i].toLowerCase(),
  )

  function setStop(i, value) {
    setHex((prev) => prev.map((h, idx) => (idx === i ? value : h)))
    setStatus(null)
  }

  async function save(next = hex) {
    if (!user?.id || busy) return
    setBusy(true)
    setStatus(null)
    const custom = next.some(
      (h, i) => h.toLowerCase() !== DEFAULT_MOOD_HEX[i].toLowerCase(),
    )
    try {
      await pb
        .collection('users')
        .update(user.id, { moodGradient: custom ? next : null })
      setMoodGradient(custom ? next : null)
      setStatus({ ok: true, message: 'Salvato.' })
    } catch (err) {
      setStatus({ ok: false, message: describeError(err) })
    } finally {
      setBusy(false)
    }
  }

  function resetToDefault() {
    setHex(DEFAULT_MOOD_HEX)
    save(DEFAULT_MOOD_HEX)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-soft">
        I colori con cui l’app rappresenta l’umore delle note (barra del mood,
        pagine del mese, statistiche). Le posizioni sono fisse: da “pessimo” a
        sinistra a “ottimo” a destra. Valgono su tutti i tuoi dispositivi.
      </p>

      {/* Anteprima */}
      <div
        className="h-5 w-full rounded-full border border-line-soft"
        style={{ background: gradientCss(hex) }}
      />
      <div className="flex gap-1">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => {
          const rgb = sampleColor(hex, v)
          return (
            <span
              key={v}
              className="h-6 flex-1 rounded-md border border-line-soft"
              style={{ backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
              title={`mood ${Math.round(v * 100)}`}
            />
          )
        })}
      </div>

      {/* Sei selettori di colore */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {hex.map((h, i) => (
          <label
            key={i}
            className="flex items-center gap-2 rounded-xl border border-line bg-cream px-2 py-1.5"
          >
            <input
              type="color"
              value={h}
              onChange={(e) => setStop(i, e.target.value)}
              className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label={`Colore per "${STOP_LABELS[i]}"`}
            />
            <span className="min-w-0 truncate text-[11px] font-semibold text-ink-soft">
              {STOP_LABELS[i]}
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

// Interpola un colore del gradiente `hex` alla posizione v (0–1), per le
// pastiglie d'anteprima — stessa logica di moodColor ma su un array locale
// non ancora salvato.
function sampleColor(hex, v) {
  const rgb = hex.map(hexToRgb)
  const pos = MOOD_STOP_POSITIONS
  for (let i = 0; i < pos.length - 1; i++) {
    if (v >= pos[i] && v <= pos[i + 1]) {
      const k = pos[i + 1] === pos[i] ? 0 : (v - pos[i]) / (pos[i + 1] - pos[i])
      return [0, 1, 2].map((c) =>
        Math.round(rgb[i][c] + (rgb[i + 1][c] - rgb[i][c]) * k),
      )
    }
  }
  return rgb[rgb.length - 1]
}
