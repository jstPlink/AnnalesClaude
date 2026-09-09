import Icon from './Icon'
import { moodColor, moodTextColor } from '../lib/mood'
import { dayKey, dayMonthLabel, timeLabel } from '../lib/dates'

// Dialog che elenca un gruppo di note (es. tutte quelle di un giorno della
// settimana, o di una settimana), cliccabili per aprire la nota. Usato dalle
// Statistiche per "Giorno più su di morale" e "Settimana migliore".
export default function NotesListSheet({ open, title, subtitle, notes, onClose, onSelectNote }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[75vh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-cream sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold text-ink">{title}</h3>
            {subtitle && <p className="truncate text-xs text-ink-soft">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-ink-soft transition hover:text-ink"
            title="Chiudi"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!notes.length ? (
            <p className="py-6 text-center text-sm text-ink-soft">Nessuna nota.</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onSelectNote(n.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line-soft bg-panel px-3 py-2.5 text-left transition active:brightness-95"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
                    style={{
                      backgroundColor: moodColor(n.mood),
                      color: moodTextColor(n.mood),
                    }}
                  >
                    {Math.round(Number(n.mood) * 100)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {n.title || <span className="italic text-ink-soft">Senza titolo</span>}
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {dayMonthLabel(dayKey(n.date))} · {timeLabel(n.timeStart)}–
                      {timeLabel(n.timeEnd)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
