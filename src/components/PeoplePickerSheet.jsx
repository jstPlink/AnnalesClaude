import { useMemo, useState } from 'react'
import Icon from './Icon'
import PersonAvatar from './PersonAvatar'
import { haptic } from '../lib/haptics'
import { createPerson } from '../lib/people'

function PersonRow({ person, active, immichUrl, immichApiKey, onToggle }) {
  return (
    <button
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
      <PersonAvatar person={person} immichUrl={immichUrl} immichApiKey={immichApiKey} />
      <span className="text-sm font-semibold text-ink">{person.name}</span>
      {active && (
        <span className="ml-auto text-ink">
          <Icon name="check" size={18} />
        </span>
      )}
    </button>
  )
}

// Dialog per selezionare le persone coinvolte in questa nota: tra quelle già
// in elenco (Profilo / Immich), o creandone una nuova al volo (solo nome).
// Con `usageCounts` ({ personId: n° note }) le persone già usate almeno una
// volta salgono in cima (ordinate per uso, poi alfabetico) e sono separate
// visivamente ("Frequenti" / "Altre persone") dal resto, ordinato solo
// alfabeticamente.
export default function PeoplePickerSheet({
  open,
  people,
  selectedIds,
  immichUrl,
  immichApiKey,
  onClose,
  onToggle,
  onCreated,
  usageCounts,
}) {
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Separa chi ha già almeno una nota (ordinate per uso, poi alfabetico) dal
  // resto (solo alfabetico), così le più frequenti in cima non si confondono
  // con le altre.
  const { frequentPeople, otherPeople } = useMemo(() => {
    if (!usageCounts) return { frequentPeople: people, otherPeople: [] }
    const frequent = []
    const other = []
    for (const person of people) {
      ;(usageCounts[person.id] ? frequent : other).push(person)
    }
    frequent.sort((a, b) => {
      const diff = (usageCounts[b.id] || 0) - (usageCounts[a.id] || 0)
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    })
    other.sort((a, b) => a.name.localeCompare(b.name))
    return { frequentPeople: frequent, otherPeople: other }
  }, [people, usageCounts])

  if (!open) return null

  async function handleCreate() {
    const name = newName.trim()
    if (!name || creating) return
    haptic()
    setCreating(true)
    setError('')
    try {
      const rec = await createPerson(name)
      onCreated?.(rec)
      setNewName('')
    } catch (err) {
      setError(err?.message || 'Errore nella creazione della persona.')
    } finally {
      setCreating(false)
    }
  }

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

        <div className="flex gap-2 border-b border-line px-5 py-3">
          <input
            type="text"
            placeholder="Nuova persona…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="min-w-0 flex-1 rounded-xl border border-line bg-tag px-3 py-2 text-sm text-ink outline-none"
          />
          <button
            type="button"
            disabled={!newName.trim() || creating}
            onClick={handleCreate}
            className="shrink-0 rounded-xl border border-save-dark bg-save px-3 py-2 text-sm font-bold text-ink transition disabled:opacity-50"
          >
            {creating ? '…' : 'Crea'}
          </button>
        </div>
        {error && <p className="px-5 pt-2 text-xs text-delete-dark">{error}</p>}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!people.length ? (
            <p className="py-6 text-center text-sm text-ink-soft">
              Nessuna persona ancora. Creane una qui sopra, oppure aggiungine
              dal tuo Immich in Profilo → Persone.
            </p>
          ) : (
            <>
              {frequentPeople.length > 0 && (
                <div className="space-y-1">
                  {otherPeople.length > 0 && (
                    <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Frequenti
                    </p>
                  )}
                  {frequentPeople.map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      active={selectedIds.includes(person.id)}
                      immichUrl={immichUrl}
                      immichApiKey={immichApiKey}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
              )}
              {otherPeople.length > 0 && (
                <div
                  className={
                    frequentPeople.length > 0 ? 'mt-4 space-y-1 border-t border-line pt-3' : 'space-y-1'
                  }
                >
                  {frequentPeople.length > 0 && (
                    <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Altre persone
                    </p>
                  )}
                  {otherPeople.map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      active={selectedIds.includes(person.id)}
                      immichUrl={immichUrl}
                      immichApiKey={immichApiKey}
                      onToggle={onToggle}
                    />
                  ))}
                </div>
              )}
            </>
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
