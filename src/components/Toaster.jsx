import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToast } from '../lib/toast'
import { playSound } from '../lib/sounds'

const LEAVE_MS = 800 // durata dello "strappo" in uscita (vedi .toast-half in index.css)

// Mostra l'ultimo avviso di lib/toast.js: cade dall'alto (animazione in CSS),
// resta per `ms` e poi si strappa a metà: le due metà escono una a sinistra e
// una a destra dello schermo.
export default function Toaster() {
  const [item, setItem] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const leave = useCallback(() => {
    clearTimers()
    setLeaving(true)
    playSound('page')
    timers.current.push(
      setTimeout(() => {
        setItem(null)
        setLeaving(false)
      }, LEAVE_MS),
    )
  }, [])

  useEffect(
    () =>
      subscribeToast((t) => {
        clearTimers()
        setLeaving(false)
        // un attimo dopo, a fine ridisegno (la chiusura del pannello pesa):
        // così la caduta non parte a scatti
        timers.current.push(
          setTimeout(() => {
            requestAnimationFrame(() => {
              playSound('notice')
              setItem(t)
              timers.current.push(setTimeout(leave, t.ms))
            })
          }, 60),
        )
      }),
    [leave],
  )
  useEffect(() => clearTimers, [])

  if (!item) return null

  const card = (extra = '') => (
    <div className={'toast-paper w-[min(92vw,26rem)] px-5 py-4 text-center font-bold leading-snug text-ink ' + extra}>
      {item.message}
    </div>
  )

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+7rem)] z-[80] flex justify-center px-3">
      {/* key: a ogni nuovo avviso l'animazione di caduta riparte */}
      {!leaving ? (
        <div key={item.id} role="status" onClick={leave} className="pointer-events-auto">
          {card()}
        </div>
      ) : (
        <div key={`${item.id}-tear`} className="relative" aria-hidden="true">
          <div className="invisible">{card()}</div>
          <div className="toast-half toast-half-left absolute inset-0">{card('toast-torn toast-torn-left')}</div>
          <div className="toast-half toast-half-right absolute inset-0">{card('toast-torn toast-torn-right')}</div>
        </div>
      )}
    </div>
  )
}
