import Icon from './Icon'
import { haptic } from '../lib/haptics'

// Scelta rapida da telefono prima di aprire una nuova nota: con Gemini
// (genera una bozza da un prompt o dalle foto) oppure a mano. Sostituisce il
// vecchio pulsante Gemini separato nel footer mobile — un tap in meno da
// mostrare in barra, la scelta emerge solo quando serve.
export default function NewNoteChoiceSheet({ open, onClose, onGemini, onManual }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-cream p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">Nuova nota</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-soft transition hover:text-ink"
            title="Chiudi"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              haptic()
              onGemini()
            }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-tag px-4 py-3.5 text-left transition active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-cream">
              <Icon name="sparkles" size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink">Con Gemini</span>
              <span className="block text-xs text-ink-soft">
                Descrivi la giornata o parti dalle foto: la bozza è pronta da rivedere.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic()
              onManual()
            }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-tag px-4 py-3.5 text-left transition active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-cream text-ink">
              <Icon name="edit" size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink">Manuale</span>
              <span className="block text-xs text-ink-soft">Scrivi la nota da zero, come sempre.</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
