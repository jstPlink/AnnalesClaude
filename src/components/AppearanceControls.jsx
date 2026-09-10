import { useRef, useState } from 'react'
import {
  THEMES,
  THEME_LABELS,
  FONTS,
  FONT_LABELS,
  ANIMS,
  ANIM_LABELS,
  PAPERS,
  PAPER_LABELS,
  SKIN_DAYS,
  SKIN_DAY_LABELS,
  SKIN_MONTHS,
  SKIN_MONTH_LABELS,
  getTheme,
  getFont,
  getAnim,
  getPaper,
  getPaperImage,
  getSkinDay,
  getSkinMonth,
  setTheme,
  setFont,
  setAnim,
  setPaper,
  setPaperImage,
  clearPaperImage,
  setSkinDay,
  setSkinMonth,
} from '../lib/prefs'

// Ridimensiona un'immagine scelta dall'utente a un lato massimo e la
// converte in data URL JPEG: così sta in localStorage (dove vivono le
// preferenze di aspetto) senza sforare la quota.
function fileToScaledDataURL(file, max = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas non disponibile'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('immagine non valida'))
    }
    img.src = url
  })
}

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
  const [paperImage, setPaperImageState] = useState(getPaperImage())
  const [imageError, setImageError] = useState('')
  const [skinDay, setSkinDayState] = useState(getSkinDay())
  const [skinMonth, setSkinMonthState] = useState(getSkinMonth())
  const fileRef = useRef(null)

  async function onPickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageError('')
    try {
      const dataUrl = await fileToScaledDataURL(file)
      if (!setPaperImage(dataUrl)) {
        setImageError('Immagine troppo grande per essere salvata. Prova con una più piccola.')
        return
      }
      setPaperImageState(dataUrl)
      setPaperState('immagine')
      setPaper('immagine')
    } catch {
      setImageError('Non riesco a leggere questa immagine.')
    }
  }

  function removeImage() {
    clearPaperImage()
    setPaperImageState('')
    setImageError('')
    setPaperState('nessuna')
    setPaper('nessuna')
  }

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
                if (p === 'immagine' && !paperImage) {
                  fileRef.current?.click()
                  return
                }
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
                className="paper-swatch flex h-9 w-full items-center justify-center overflow-hidden rounded border border-line-soft bg-cover bg-center text-ink-soft"
                data-p={p === 'nessuna' || p === 'immagine' ? '' : p}
                style={
                  p === 'immagine' && paperImage
                    ? { backgroundImage: `url(${paperImage})` }
                    : undefined
                }
              >
                {p === 'immagine' && !paperImage && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-4.5-4.5L5 21" />
                  </svg>
                )}
              </span>
              <span className="text-[10px] font-semibold text-ink-soft">
                {PAPER_LABELS[p]}
              </span>
            </button>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickImage}
        />
        {(paper === 'immagine' || paperImage) && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-line bg-cream px-3 py-1 font-semibold text-ink transition active:scale-95"
            >
              {paperImage ? 'Cambia immagine…' : 'Scegli un’immagine…'}
            </button>
            {paperImage && (
              <button
                type="button"
                onClick={removeImage}
                className="font-semibold text-delete-dark transition active:scale-95"
              >
                Rimuovi
              </button>
            )}
            {imageError && <span className="text-delete-dark">{imageError}</span>}
          </div>
        )}
        {paper === 'immagine' && (
          <p className="mt-1.5 text-xs text-ink-soft">
            L’immagine resta su questo dispositivo (ridimensionata a max 1400 px).
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-line-soft pt-4">
        <Segmented
          label="Vista giorno"
          options={SKIN_DAYS}
          labels={SKIN_DAY_LABELS}
          value={skinDay}
          onChange={(v) => {
            setSkinDayState(v)
            setSkinDay(v)
          }}
        />
        <Segmented
          label="Vista mese (web)"
          options={SKIN_MONTHS}
          labels={SKIN_MONTH_LABELS}
          value={skinMonth}
          onChange={(v) => {
            setSkinMonthState(v)
            setSkinMonth(v)
          }}
        />
        <p className="text-xs text-ink-soft">
          Stili grafici alternativi per una singola vista. “Disegnata” trasforma
          la vista giorno in un diario tracciato a mano; per il mese (solo da
          web) “Bacheca” lo dispone come un collage e “Pagine” come pagine di
          diario impilate.
        </p>
      </div>

      <p className="text-xs text-ink-soft">
        Le preferenze di aspetto valgono solo su questo dispositivo.
      </p>
    </div>
  )
}
