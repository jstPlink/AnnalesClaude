import { useEffect, useState } from 'react'
import { getGeminiUsage, onGeminiUsageChange } from '../lib/geminiUsage'

// Contatore delle richieste a Gemini fatte da questo dispositivo: ultimo minuto,
// ultima ora e ultime 24 ore. Sta dove si può scrivere una nota con Gemini e in
// Impostazioni → Gemini. Non include le richieste del server (recap delle
// 23:00) né quelle di altri dispositivi con la stessa chiave.
export default function GeminiUsage({ className = '' }) {
  const [usage, setUsage] = useState(getGeminiUsage)

  useEffect(() => {
    const refresh = () => setUsage(getGeminiUsage())
    const off = onGeminiUsageChange(refresh)
    const t = setInterval(refresh, 15_000) // le finestre scorrono col tempo
    return () => {
      off()
      clearInterval(t)
    }
  }, [])

  return (
    <p className={'text-[11px] leading-snug text-ink-soft ' + className}>
      Richieste a Gemini da questo dispositivo — ultimo minuto: <b>{usage.minute}</b> · ultima ora:{' '}
      <b>{usage.hour}</b> · ultime 24 h: <b>{usage.day}</b>
    </p>
  )
}
