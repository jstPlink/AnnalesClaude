import { useState } from 'react'
import Icon from './Icon'
import { haptic } from '../lib/haptics'

// Sezione a fisarmonica per organizzare pagine lunghe (es. Profilo).
export default function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          haptic()
          setOpen((v) => !v)
        }}
        className="flex w-full items-center justify-between px-1 py-1"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {title}
        </span>
        <span
          className={
            'text-ink-soft transition-transform ' + (open ? 'rotate-180' : '')
          }
        >
          <Icon name="chevron-right" size={16} className="rotate-90" />
        </span>
      </button>
      {open && children}
    </div>
  )
}
