import { useEffect, useState } from 'react'

// true quando la finestra è larga abbastanza per il layout desktop.
const QUERY = '(min-width: 1024px)'

export function useIsWide() {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia(QUERY).matches
      : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setWide(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return wide
}
