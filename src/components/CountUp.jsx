import { useEffect, useRef, useState } from 'react'

// Conta da valore precedente a `value` con easing. Se `value` non è numerico
// (es. "—") lo mostra così com'è. Rispetta l'impostazione Animazioni.
export default function CountUp({ value, duration = 1000, className }) {
  const isNum = typeof value === 'number' && Number.isFinite(value)
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (!isNum || typeof from !== 'number' || from === value) {
      setDisplay(value)
      return
    }
    if (document.documentElement.dataset.anim === 'off') {
      setDisplay(value)
      return
    }
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, isNum])

  return <span className={className}>{display}</span>
}
