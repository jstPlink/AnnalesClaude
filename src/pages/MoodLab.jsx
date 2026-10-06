import { useEffect, useRef } from 'react'
import Icon from '../components/Icon'
import MobileTopBar from '../components/MobileTopBar'
import PhoneShell from '../components/PhoneShell'
import { useAuth } from '../context/AuthContext'
import { useIsWide } from '../hooks/useIsWide'
import { useGoBack } from '../hooks/useBack'
import { haptic } from '../lib/haptics'
import { getMoodFormula, normalizeMoodFormula, setMoodFormula } from '../lib/mood'
import { pb } from '../lib/pocketbase'
import { toast } from '../lib/toast'

// Mood Lab: banco di prova per mettere a punto la formula del mood (da note a
// giorno e da giorni a mese) con dati di esempio — non tocca le note vere. È una
// pagina a sé (public/mood-lab.html) mostrata qui dentro. Con «Applica all'app» la
// formula scelta viene salvata sul TUO account (campo `moodFormula`) e usata in tutta
// l'app: mood dei giorni, dei mesi, statistiche, andamento, widget. «Ripristina»
// torna alla formula originale. Si raggiunge toccando 5 volte la riga della versione
// in Impostazioni (components/VersionTap.jsx).
export default function MoodLab() {
  const wide = useIsWide()
  const goBack = useGoBack()
  const { user } = useAuth()
  const frame = useRef(null)
  const userId = user?.id

  useEffect(() => {
    const reply = (msg) => frame.current?.contentWindow?.postMessage(msg, window.location.origin)

    async function save(value) {
      await pb.collection('users').update(userId, { moodFormula: value })
      setMoodFormula(value)
    }

    async function onMessage(e) {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return
      const msg = e.data
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'mood-lab-ready') {
        reply({ type: 'mood-lab-init', formula: getMoodFormula() })
      } else if (msg.type === 'mood-lab-apply' || msg.type === 'mood-lab-reset') {
        const apply = msg.type === 'mood-lab-apply'
        const value = apply ? normalizeMoodFormula(msg.formula) : null
        if (apply && !value) {
          reply({ type: 'mood-lab-status', ok: false, message: 'Formula non valida.' })
          return
        }
        try {
          await save(value)
          const text = apply
            ? 'Formula applicata a tutta l\u2019app, per il tuo account.'
            : 'Formula originale ripristinata.'
          reply({ type: 'mood-lab-status', ok: true, message: text })
          toast(text, 3000)
          // ricarica: tutte le pagine ricalcolano i mood con la formula nuova
          setTimeout(() => window.location.replace('/'), 1500)
        } catch (err) {
          reply({ type: 'mood-lab-status', ok: false, message: err?.message || 'Non sono riuscito a salvare.' })
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [userId])

  const iframe = (
    <iframe
      ref={frame}
      title="Mood Lab"
      src="/mood-lab.html"
      className="min-h-0 w-full flex-1 border-0"
    />
  )

  // Telefono: stessa impalcatura delle altre pagine (PhoneShell + barra in alto
  // che rispetta il notch), il Lab occupa il resto dello schermo.
  if (!wide) {
    return (
      <PhoneShell className="!h-dvh !min-h-0">
        <MobileTopBar className="mtop-day">
          <button
            type="button"
            className="mchev"
            onClick={() => {
              haptic()
              goBack()
            }}
            title="Indietro"
            aria-label="Indietro"
          >
            <Icon name="chevron-left" size={21} strokeWidth={2.8} />
          </button>
          <div className="flex flex-1 justify-center">
            <h1 className="text-base font-extrabold text-ink">Mood Lab</h1>
          </div>
        </MobileTopBar>
        <div className="flex min-h-0 flex-1 flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {iframe}
        </div>
      </PhoneShell>
    )
  }

  return (
    <div className="flex w-full flex-col bg-cream" style={{ height: 'calc(100dvh - 4rem)' }}>
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={() => {
            haptic()
            goBack()
          }}
          className="rounded-full border border-line bg-tag p-1.5 text-ink"
          title="Indietro"
          aria-label="Indietro"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <h1 className="text-base font-extrabold text-ink">Mood Lab</h1>
      </div>
      {iframe}
    </div>
  )
}
