import { moodColor } from '../lib/mood'

const TRACK_GRADIENT =
  'linear-gradient(to right,' +
  'rgb(226,59,46) 0%,' +
  'rgb(240,140,30) 20%,' +
  'rgb(242,208,36) 40%,' +
  'rgb(87,192,74) 60%,' +
  'rgb(63,123,216) 80%,' +
  'rgb(255,255,255) 100%)'

// Slider per il valore `mood` (0–1).
export default function MoodSlider({ value, onChange }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <span>Mood</span>
        <span className="tabular-nums">{Number(value).toFixed(2)}</span>
      </div>
      <div
        className="rounded-full p-1"
        style={{ background: TRACK_GRADIENT }}
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
          style={{ '--thumb': moodColor(value) }}
        />
      </div>
    </div>
  )
}
