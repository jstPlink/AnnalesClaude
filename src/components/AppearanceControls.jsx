import { useState } from 'react'
import {
  THEMES,
  THEME_LABELS,
  FONTS,
  FONT_LABELS,
  ANIMS,
  ANIM_LABELS,
  PAPERS,
  PAPER_LABELS,
  getTheme,
  getFont,
  getAnim,
  getPaper,
  setTheme,
  setFont,
  setAnim,
  setPaper,
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

// Selettori tema, font, animazioni e sfondo. Applicano subito la scelta
// (localStorage + attributi su <html>, vedi src/lib/prefs.js).
export default function AppearanceControls() {
  const [theme, setThemeState] = useState(getTheme())
  const [font, setFontState] = useState(getFont())
  const [anim, setAnimState] = useState(getAnim())
  const [paper, setPaperState] = useState(getPaper())

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
      <Segmented
        label="Animazioni"
        options={ANIMS}
        labels={ANIM_LABELS}
        value={anim}
        onChange={(v) => {
          setAnimState(v)
          setAnim(v)
        }}
      />

      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Sfondo
        </span>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {PAPERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPaperState(p)
                setPaper(p)
              }}
              title={PAPER_LABELS[p]}
              className={
                'flex flex-col items-center gap-1 rounded-lg border p-1.5 transition active:scale-95 ' +
                (paper === p
                  ? 'border-ink ring-2 ring-ink/25'
                  : 'border-line hover:border-ink-soft')
              }
            >
              <span
                className="paper-swatch h-9 w-full rounded border border-line-soft"
                data-p={p === 'nessuna' ? '' : p}
              />
              <span className="text-[10px] font-semibold text-ink-soft">
                {PAPER_LABELS[p]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-soft">
        Le preferenze di aspetto valgono solo su questo dispositivo.
      </p>
    </div>
  )
}
