import { useEffect } from 'react'
import { haptic } from '../lib/haptics'

// Finestra modale semplice (es. per notificare errori di salvataggio).
export default function Dialog({ open, title, lines = [], tone = 'error', onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-cream p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <h3
          className={
            'text-lg font-extrabold ' +
            (tone === 'error' ? 'text-delete-dark' : 'text-ink')
          }
        >
          {title}
        </h3>

        {lines.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-ink">
            {lines.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => {
            haptic()
            onClose?.()
          }}
          className="mt-5 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-cream transition active:scale-95"
        >
          Chiudi
        </button>
      </div>
    </div>
  )
}
