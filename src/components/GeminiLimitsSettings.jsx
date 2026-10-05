import { useState } from 'react'
import GeminiUsage from './GeminiUsage'
import { getGeminiLimits, setGeminiLimits } from '../lib/geminiUsage'

// Impostazioni → Gemini → Limiti di richieste: i limiti della TUA chiave, da
// copiare da Google AI Studio (aistudio.google.com → il tuo progetto → Limiti
// di frequenza / Rate limits). L'API non li comunica e cambiano con il modello
// e il piano, per questo non ci sono valori predefiniti. Servono a mostrare
// quante richieste restano (vedi GeminiUsage). Per dispositivo.
export default function GeminiLimitsSettings() {
  const [limits, setLimits] = useState(getGeminiLimits)

  function change(key, value) {
    const next = { ...limits, [key]: value === '' ? 0 : Number(value) }
    setLimits(next)
    setGeminiLimits(next)
  }

  const field = (key, label) => (
    <label className="block flex-1">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={limits[key] || ''}
        placeholder="non impostato"
        onChange={(e) => change(key, e.target.value)}
        className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft"
      />
    </label>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft sm:text-sm">
        Google non comunica quante richieste restano: l&apos;app conta quelle che parte da questo
        dispositivo e le confronta con i limiti della tua chiave. Copiali da Google AI Studio
        (il tuo progetto → Limiti di frequenza), per il modello che usa l&apos;app. I limiti ufficiali sono
        al <b>minuto</b> e al <b>giorno</b>.
      </p>
      <div className="flex gap-3">
        {field('perMinute', 'Richieste al minuto')}
        {field('perDay', 'Richieste al giorno')}
      </div>
      <GeminiUsage />
      <p className="text-[11px] text-ink-soft">
        Non include i recap scritti dal server alle 23:00 né altri dispositivi con la stessa chiave:
        il conteggio reale può essere più alto. Il limite giornaliero si azzera a mezzanotte, ora
        del Pacifico (di solito intorno alle 9 in Italia).
      </p>
    </div>
  )
}
