import { moodColor, moodTextColor } from '../lib/mood'

// Slider per il valore `mood` (0–1). La barra mostra SOLO il colore
// corrispondente al valore attuale: spostando il cursore il colore cambia.
// Etichetta e valore vivono dentro la barra, alle estremità, per risparmiare
// spazio verticale.
export default function MoodSlider({ value, onChange }) {
  const color = moodColor(value)
  const textColor = moodTextColor(value)
  return (
    <div
      className="relative flex h-[1.6rem] items-center rounded-full px-3"
      style={{ backgroundColor: color }}
    >
      <span
        className="pointer-events-none absolute left-3 text-[10px] font-bold uppercase tracking-wide"
        style={{ color: textColor }}
      >
        Mood
      </span>
      <span
        className="pointer-events-none absolute right-3 text-[10px] font-bold tabular-nums"
        style={{ color: textColor }}
      >
        {Math.round(Number(value) * 100)}
      </span>
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
  )
}
