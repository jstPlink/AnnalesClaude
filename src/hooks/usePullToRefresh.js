import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'

const TRIGGER = 70
const MAX = 110

// Pull-to-refresh: trascinando verso il basso quando il contenitore è già in
// cima. Restituisce { pull, refreshing } per disegnare l'indicatore.
// `onRefresh` deve restituire una promise.
export function usePullToRefresh(ref, onRefresh) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const cb = useRef(onRefresh)
  useEffect(() => {
    cb.current = onRefresh
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let startY = null
    let dist = 0
    let busy = false

    const onStart = (e) => {
      if (busy || el.scrollTop > 0 || e.touches.length !== 1) return
      startY = e.touches[0].clientY
      dist = 0
    }
    const onMove = (e) => {
      if (startY == null) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0 || el.scrollTop > 0) {
        startY = null
        dist = 0
        setPull(0)
        return
      }
      dist = Math.min(MAX, dy * 0.5)
      setPull(dist)
    }
    const onEnd = async () => {
      if (startY == null) return
      startY = null
      if (dist >= TRIGGER * 0.5 && !busy) {
        busy = true
        haptic(15)
        setRefreshing(true)
        setPull(TRIGGER * 0.5)
        try {
          await cb.current()
        } catch {
          /* l'errore è già mostrato dalla pagina */
        }
        setRefreshing(false)
        busy = false
      }
      dist = 0
      setPull(0)
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [ref])

  return { pull, refreshing }
}
