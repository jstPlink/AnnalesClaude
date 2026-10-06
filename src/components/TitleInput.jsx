import { useLayoutEffect, useRef } from 'react'

// Titolo della nota: come un campo di testo, ma se è più lungo della larghezza
// va a capo e occupa fino a DUE righe (poi scorre dentro il campo). Invio non
// manda a capo: il titolo resta una riga logica.
export default function TitleInput({ value, onChange, placeholder, className = '' }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const lh = parseFloat(getComputedStyle(el).lineHeight) || el.scrollHeight
    const max = Math.ceil(lh * 2)
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
    el.style.overflowY = el.scrollHeight > max + 1 ? 'auto' : 'hidden'
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault()
      }}
      className={className + ' uppercase'}
      aria-label={placeholder}
    />
  )
}
