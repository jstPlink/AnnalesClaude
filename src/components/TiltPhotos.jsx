import { useEffect } from 'react'
import { syncTilt, stopTilt } from '../lib/tilt'

// Fa oscillare le foto col giroscopio (src/lib/tilt.js). Si riallinea alla
// preferenza ogni volta che le preferenze cambiano (applyPrefs manda
// 'annales:prefs'): interruttore in Impostazioni → Permessi e animazioni.
export default function TiltPhotos() {
  useEffect(() => {
    syncTilt()
    window.addEventListener('annales:prefs', syncTilt)
    return () => {
      window.removeEventListener('annales:prefs', syncTilt)
      stopTilt()
    }
  }, [])
  return null
}
