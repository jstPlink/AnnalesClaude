import { useEffect, useState } from 'react'
import { getGeminiLimits, getGeminiUsage, onGeminiUsageChange } from '../lib/geminiUsage'

// Riga con le richieste a Gemini fatte da questo dispositivo: ultimo minuto,
// ultima ora e ultime 24 ore, con i limiti impostati in Impostazioni → Gemini
// (se ci sono) e i rimanenti. Da mettere dove si usa Gemini, così si vede
// prima di registrare un vocale o chiedere una bozza se si è vicini al limite.
// Le richieste del server (recap delle 23:00) e di altri dispositivi con la
// stessa chiave non sono incluse.
export default function GeminiUsage({ className = '' }) {
  const [usage, setUsage] = useState(getGeminiUsage)
  const [limits, setLimits] = useState(getGeminiLimits)

  useEffect(() => {
    const refresh = () => {
      setUsage(getGeminiUsage())
      setLimits(getGeminiLimits())
    }
    const off = onGeminiUsageChange(refresh)
    const t = setInterval(refresh, 15_000) // le finestre scorrono col tempo
    return () => {
      off()
      clearInterval(t)
    }
  }, [])

  const cell = (label, used, limit) => {
    const left = limit ? Math.max(0, limit - used) : null
    const low = limit && left <= Math.max(1, Math.round(limit * 0.1))
    return (
      <span className={low ? 'font-bold text-delete-dark' : ''}>
        {label}: <b>{used}</b>
        {limit ? ` / ${limit} (restano ${left})` : ''}
      </span>
    )
  }

  return (
    <p className={'text-[11px] leading-snug text-ink-soft ' + className}>
      Richieste a Gemini da questo dispositivo — {cell('ultimo minuto', usage.minute, limits.perMinute)}
      {' · '}
      <span>
        ultima ora: <b>{usage.hour}</b>
      </span>
      {' · '}
      {cell('ultime 24 h', usage.day, limits.perDay)}
      {usage.rejected > 0 && <span> · respinte per limite: {usage.rejected}</span>}
    </p>
  )
}
