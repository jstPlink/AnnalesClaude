import Icon from './Icon'
import { haptic } from '../lib/haptics'

// Piccolo menu per scegliere la sorgente delle immagini da aggiungere:
// dispositivo locale oppure Immich (se configurato in Profilo).
export default function AddImagesSheet({ open, onClose, onDevice, onImmich }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-center text-lg font-extrabold text-ink">
          Aggiungi immagini
        </h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              haptic()
              onClose()
              onDevice()
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-tag px-4 py-3 text-left text-sm font-semibold text-ink transition active:scale-[0.98]"
          >
            <Icon name="image" size={20} />
            Da questo dispositivo
          </button>
          {onImmich && (
            <button
              type="button"
              onClick={() => {
                haptic()
                onClose()
                onImmich()
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-tag px-4 py-3 text-left text-sm font-semibold text-ink transition active:scale-[0.98]"
            >
              <Icon name="cloud" size={20} />
              Da Immich
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
