import { useEffect, useRef, useState } from 'react'

function pad2(n) {
  return String(n).padStart(2, '0')
}

const STEP = 5
const TIMES = Array.from({ length: (24 * 60) / STEP }, (_, i) => {
  const total = i * STEP
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
})

// Popover per scegliere un orario (HH:MM), stessa estetica "sveglia LCD"
// del pannello Orario: una sola colonna semplice (niente più due rotelle
// ore/minuti affiancate né intestazione con titolo/chiudi), così resta
// stretta abbastanza da non uscire dallo schermo anche quando l'orologio
// che la apre è vicino al bordo — il tocco su un valore lo applica e
// chiude subito, come nel calendario.
export default function TimePickerPopover({
  time,
  onChange,
  className = '',
  buttonClassName = '',
  children,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const listRef = useRef(null)

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

  const [h, m] = (time || '00:00').split(':').map(Number)
  const activeIdx = Math.min(TIMES.length - 1, Math.max(0, Math.round((h * 60 + m) / STEP)))

  useEffect(() => {
    if (!open) return
    listRef.current?.children[activeIdx]?.scrollIntoView({ block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className={'relative ' + className} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        className={buttonClassName}
      >
        {children}
      </button>

      {open && (
        <div className="tp-pop">
          <div className="tp-list" ref={listRef}>
            {TIMES.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t)
                  setOpen(false)
                }}
                className={'tp-item' + (i === activeIdx ? ' active' : '')}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
