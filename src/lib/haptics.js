// Breve feedback aptico al tap (solo dove supportato, es. Android).
export function haptic(ms = 8) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms)
    }
  } catch {
    /* non supportato: ignora */
  }
}
