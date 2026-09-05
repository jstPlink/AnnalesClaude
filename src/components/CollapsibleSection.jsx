import { useState } from 'react'
import Icon from './Icon'
import { haptic } from '../lib/haptics'

// Sezione a fisarmonica per organizzare pagine lunghe (es. Profilo).
// L'intera sezione (anche da chiusa) è un riquadro visibile con bordo, così
// è chiaro dove toccare per espanderla.
export default function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
      <button
        type="button"
        onClick={() => {
          haptic()
          setOpen((v) => !v)
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition active:bg-tag/40"
      >
        <span className="text-sm font-bold text-ink">{title}</span>
        <Icon
          name="chevron-right"
          size={16}
          className={'shrink-0 text-ink-soft transition-transform ' + (open ? 'rotate-90' : '')}
        />
      </button>
      {open && <div className="space-y-3 border-t border-line p-4">{children}</div>}
    </div>
  )
}
