import Icon from './Icon'
import PersonAvatar from './PersonAvatar'
import { haptic } from '../lib/haptics'

// Dialog per selezionare, tra le persone già aggiunte in Profilo, quelle
// coinvolte in questa nota.
export default function PeoplePickerSheet({
  open,
  people,
  selectedIds,
  immichUrl,
  immichApiKey,
  onClose,
  onToggle,
}) {
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
          <h3 className="text-lg font-extrabold text-ink">Persone</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-soft transition hover:text-ink"
            title="Chiudi"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!people.length ? (
            <p className="py-6 text-center text-sm text-ink-soft">
              Non hai ancora aggiunto nessuna persona. Vai in Profilo → Persone
              per aggiungerne dal tuo Immich.
            </p>
          ) : (
            <div className="space-y-1">
              {people.map((person) => {
                const active = selectedIds.includes(person.id)
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => {
                      haptic()
                      onToggle(person.id)
                    }}
                    className={
                      'flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition ' +
                      (active ? 'bg-tag' : 'hover:bg-tag/60')
                    }
                  >
                    <PersonAvatar
                      person={person}
                      immichUrl={immichUrl}
                      immichApiKey={immichApiKey}
                    />
                    <span className="text-sm font-semibold text-ink">{person.name}</span>
                    {active && (
                      <span className="ml-auto text-ink">
                        <Icon name="check" size={18} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-save px-6 py-3 text-sm font-bold text-ink transition active:scale-95"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  )
}
