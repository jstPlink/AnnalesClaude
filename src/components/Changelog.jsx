import { useState } from 'react'
import Icon from './Icon'
import { CHANGELOG } from '../lib/changelog'

// Elenco delle novità per versione, dentro la sezione collassabile "Novità"
// delle Impostazioni (mobile e web). Con decine di versioni accumulate
// l'elenco per esteso diventava troppo lungo da scorrere: qui ogni versione
// è una riga richiudibile (solo l'ultima aperta di default), così si scorre
// rapidamente l'elenco compatto e si apre solo quella che interessa.
export default function Changelog() {
  const [open, setOpen] = useState(() => new Set([CHANGELOG[0]?.version]))

  function toggle(version) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })
  }

  return (
    <div className="divide-y divide-line-soft">
      {CHANGELOG.map((entry) => {
        const isOpen = open.has(entry.version)
        return (
          <div key={entry.version} className="py-2 first:pt-0 last:pb-0">
            <button
              type="button"
              onClick={() => toggle(entry.version)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2 py-1 text-left"
            >
              <span className="text-sm font-bold text-ink tabular-nums">
                v{entry.version}
              </span>
              {entry.date && (
                <span className="text-xs text-ink-soft tabular-nums">
                  {entry.date}
                </span>
              )}
              <Icon
                name="chevron-right"
                size={13}
                className={
                  'ml-auto shrink-0 text-ink-soft transition-transform ' +
                  (isOpen ? 'rotate-90' : '')
                }
              />
            </button>
            {isOpen && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-ink-soft">
                {entry.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
