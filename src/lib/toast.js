// Avvisi brevi in basso (vedi components/Toaster.jsx): `toast('testo')`.
const listeners = new Set()

export function toast(message, ms = 4000) {
  listeners.forEach((fn) => fn({ id: Date.now() + Math.random(), message, ms }))
}

export function subscribeToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
