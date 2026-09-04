import { moodColor } from '../lib/mood'

// Slider per il valore `mood` (0–1). La barra mostra SOLO il colore
// corrispondente al valore attuale: spostando il cursore il colore cambia.
export default function MoodSlider({ value, onChange }) {
  const color = moodColor(value)
  return (
    <div>
      <div
        className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        <span>Mood</span>
        <span className="tabular-nums">{Math.round(Number(value) * 100)}</span>
      </div>
      <div
        className="relative flex h-9 items-center rounded-full px-1"
        style={{ backgroundColor: color }}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Valore dell'umore da 0 a 1"
          className="mood-range block h-6 w-full cursor-pointer appearance-none bg-transparent"
        />
      </div>
    </div>
  )
}
