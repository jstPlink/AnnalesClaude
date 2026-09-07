import { CHANGELOG } from '../lib/changelog'

// Elenco delle novità per versione. Usato dentro la sezione collassabile
// "Novità" delle Impostazioni (mobile e web).
export default function Changelog() {
  return (
    <div className="space-y-4">
      {CHANGELOG.map((entry) => (
        <div key={entry.version}>
          <p className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-ink tabular-nums">
              v{entry.version}
            </span>
            {entry.date && (
              <span className="text-xs text-ink-soft tabular-nums">
                {entry.date}
              </span>
            )}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-ink-soft">
            {entry.changes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
