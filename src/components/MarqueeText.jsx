import { useEffect, useRef, useState } from 'react'

// Testo su una singola riga: se eccede la larghezza disponibile, scorre
// avanti e indietro (ping pong). Altrimenti resta fermo.
export default function MarqueeText({ children, className = '' }) {
  const wrapRef = useRef(null)
  const textRef = useRef(null)
  const [overflow, setOverflow] = useState(0)

  useEffect(() => {
    const wrap = wrapRef.current
    const text = textRef.current
    if (!wrap || !text) return
    const measure = () => {
      const diff = text.scrollWidth - wrap.clientWidth
      setOverflow(diff > 4 ? diff : 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    ro.observe(text)
    return () => ro.disconnect()
  }, [children])

  const duration = Math.max(5, (overflow / 28) * 2 + 2) // ~28px/s con pause

  return (
    <span
      ref={wrapRef}
      className={'block overflow-hidden whitespace-nowrap ' + className}
    >
      <span
        ref={textRef}
        className="inline-block will-change-transform"
        style={
          overflow
            ? {
                '--shift': `-${overflow}px`,
                animationName: 'pingpong',
                animationDuration: `${duration}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
              }
            : undefined
        }
      >
        {children}
      </span>
    </span>
  )
}
