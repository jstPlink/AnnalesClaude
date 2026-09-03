import { useEffect, useRef, useState } from 'react'

// Pillola arrotondata con l'anno. Tap → selezione rapida di un altro anno.
// Se `subtitle` è presente (es. "20 Settembre") viene mostrato sotto l'anno.
export default function YearPill({
  year,
  onChange,
  subtitle = null,
  span = 8,
  minWidth = 128,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const now = new Date().getFullYear()
  const base = Math.max(year, now)
  const years = []
  for (let y = base + 2; y >= base - span; y--) years.push(y)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ minWidth }}
        className="flex max-w-full flex-col items-center rounded-full border border-line bg-sand px-4 py-1.5 shadow-sm transition active:scale-95"
      >
        <span className="text-2xl font-extrabold leading-tight text-ink">
          {year}
        </span>
        {subtitle && (
          <span className="max-w-full truncate text-sm font-semibold text-ink-soft">
            {subtitle}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-1/2 z-30 mt-2 max-h-64 w-40 -translate-x-1/2 overflow-y-auto rounded-2xl border border-line bg-cream p-2 shadow-xl no-scrollbar">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                onChange(y)
                setOpen(false)
              }}
              className={
                'block w-full rounded-xl px-3 py-2 text-center text-lg font-bold transition ' +
                (y === year
                  ? 'bg-sand text-ink'
                  : 'text-ink-soft hover:bg-panel')
              }
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
