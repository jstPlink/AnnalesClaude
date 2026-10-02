import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

let last = 0

// Breve feedback aptico al tap. Nell'app Android usa il plugin nativo, nel
// browser navigator.vibrate (solo dove supportato). Chiamate ravvicinate
// (< 40 ms) vengono unite: il listener globale dei click e gli haptic()
// dei singoli componenti non devono vibrare due volte.
export function haptic(ms = 8) {
  const now = Date.now()
  if (now - last < 40) return
  last = now
  try {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ms > 12 ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms)
    }
  } catch {
    /* non supportato: ignora */
  }
}

// Haptic su ogni tocco di un elemento cliccabile (pulsanti, link, voci
// selezionabili), senza dover aggiungere haptic() ovunque. Solo nell'app nativa.
export function installGlobalHaptics() {
  if (!Capacitor.isNativePlatform()) return
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.target instanceof Element && e.target.closest('button, a, [role="button"], summary, label, select, input[type="checkbox"], input[type="radio"]')) {
        haptic()
      }
    },
    { passive: true },
  )
}
