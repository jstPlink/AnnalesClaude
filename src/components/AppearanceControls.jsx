import { useState } from 'react'
import {
  THEMES,
  THEME_LABELS,
  FONTS,
  FONT_LABELS,
  getTheme,
  getFont,
  setTheme,
  setFont,
} from '../lib/prefs'

function Segmented({ label, options, labels, value, onChange }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={
              'rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ' +
              (value === o
                ? 'bg-ink text-cream'
                : 'border border-line bg-cream text-ink')
            }
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </div>
  )
}

// Selettori tema (chiaro/scuro/sistema) e famiglia font dell'app. Applicano
// subito la scelta (localStorage + attributi su <html>, vedi src/lib/prefs.js).
export default function AppearanceControls() {
  const [theme, setThemeState] = useState(getTheme())
  const [font, setFontState] = useState(getFont())
  return (
    <div className="space-y-4">
      <Segmented
        label="Tema"
        options={THEMES}
        labels={THEME_LABELS}
        value={theme}
        onChange={(v) => {
          setThemeState(v)
          setTheme(v)
        }}
      />
      <Segmented
        label="Font dell'app"
        options={FONTS}
        labels={FONT_LABELS}
        value={font}
        onChange={(v) => {
          setFontState(v)
          setFont(v)
        }}
      />
      <p className="text-xs text-ink-soft">
        Le preferenze di aspetto valgono solo su questo dispositivo.
      </p>
    </div>
  )
}
