import { useState } from 'react'
import { haptic } from '../lib/haptics'
import {
  ALL_DAYS,
  DAY_LABELS,
  applyReminders,
  loadReminders,
  newReminder,
} from '../lib/reminders'

// Impostazioni → Promemoria: una o più notifiche periodiche che ricordano di
// scrivere la nota del giorno. Toccando la notifica si apre la scelta
// "Con Gemini / a mano" (vedi WidgetLinks).
export default function ReminderSettings() {
  const [list, setList] = useState(loadReminders)
  const [error, setError] = useState('')

  async function update(next) {
    setList(next)
    setError('')
    try {
      const ok = await applyReminders(next)
      if (!ok) setError('Consenti le notifiche per Annales dalle impostazioni del telefono.')
    } catch {
      setError('Non riesco a programmare le notifiche su questo dispositivo.')
    }
  }

  const patch = (id, changes) =>
    update(list.map((r) => (r.id === id ? { ...r, ...changes } : r)))

  function toggleDay(r, d) {
    const days = r.days.includes(d) ? r.days.filter((x) => x !== d) : [...r.days, d].sort()
    patch(r.id, { days, enabled: days.length ? r.enabled : false })
  }

  return (
    <div className="space-y-3 text-xs sm:text-sm">
      <p className="text-ink-soft">
        Ricevi una notifica per ricordarti di scrivere la nota del giorno. Toccandola puoi
        scegliere se scriverla a mano o con Gemini.
      </p>

      {list.map((r) => (
        <div key={r.id} className="rounded-xl border border-line bg-cream p-3">
          <div className="flex items-center justify-between gap-2">
            <input
              type="time"
              value={r.time}
              onChange={(e) => e.target.value && patch(r.id, { time: e.target.value })}
              className="rounded-lg border border-line bg-cream px-2 py-1 text-lg font-bold text-ink"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => patch(r.id, { enabled: !r.enabled })}
                aria-pressed={r.enabled}
                className={
                  'rounded-full border px-3 py-1 text-xs font-bold ' +
                  (r.enabled
                    ? 'border-line bg-tag text-ink'
                    : 'border-line bg-transparent text-ink-soft')
                }
              >
                {r.enabled ? 'Attivo' : 'Spento'}
              </button>
              <button
                type="button"
                onClick={() => update(list.filter((x) => x.id !== r.id))}
                className="rounded-full border border-delete-dark bg-delete/15 px-3 py-1 text-xs font-bold text-delete-dark"
              >
                Elimina
              </button>
            </div>
          </div>
          <div className="mt-2 flex gap-1.5">
            {ALL_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(r, d)}
                aria-pressed={r.days.includes(d)}
                className={
                  'h-8 w-8 rounded-full border text-xs font-bold ' +
                  (r.days.includes(d)
                    ? 'border-line bg-tag text-ink'
                    : 'border-line-soft bg-transparent text-ink-soft')
                }
              >
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      ))}

      {!list.length && <p className="text-ink-soft">Nessun promemoria impostato.</p>}
      {error && <p className="font-semibold text-delete-dark">{error}</p>}

      <button
        type="button"
        onClick={() => {
          haptic()
          update([...list, newReminder(list)])
        }}
        className="w-full rounded-full border border-line bg-tag px-4 py-2 text-xs font-bold text-ink"
      >
        Aggiungi promemoria
      </button>
    </div>
  )
}
