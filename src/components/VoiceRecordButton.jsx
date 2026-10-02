import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import Icon from './Icon'
import { transcribeAudio, describeGeminiError } from '../lib/gemini'

// Oltre i 3 minuti si ferma da sola: un vocale per un prompt di diario non
// dovrebbe mai servirne di più, ed evita registrazioni lasciate aperte per
// sbaglio (audio via via più pesante da inviare).
const MAX_SECONDS = 180

const CANDIDATE_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return CANDIDATE_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Bottone per dettare un pezzo di prompt invece di scriverlo: registra con
// il microfono e fa trascrivere l'audio a Gemini, che capisce l'audio
// direttamente — più affidabile del dettato dello smartphone, specie su
// nomi propri e termini particolari. Il testo trascritto va al chiamante
// (`onTranscribed`), che decide se accodarlo o sostituire il prompt: qui non
// si tocca il campo direttamente. Non renderizza nulla se il browser non
// supporta la registrazione o manca la chiave Gemini.
export default function VoiceRecordButton({ apiKey, onTranscribed, disabled }) {
  const [state, setState] = useState('idle') // idle | recording | transcribing
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  // Il vocale appena registrato resta qui finché non viene trascritto con
  // successo: se la trascrizione fallisce (rete assente, tutti i riprovi
  // automatici di transcribeAudio esauriti…) si può ritrascrivere lo STESSO
  // audio con un tasto, invece di dover rifare da capo una registrazione
  // magari lunga.
  const [lastRecording, setLastRecording] = useState(null) // { blob, mimeType } | null
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  // Il browser nasconde del tutto navigator.mediaDevices fuori da un
  // "contesto sicuro" (HTTPS, o localhost): niente errore, l'API proprio non
  // esiste. Capita testando l'app dal telefono sull'indirizzo di rete locale
  // (es. http://192.168.x.x:5173) invece che in produzione (HTTPS) — sul PC
  // "localhost" è esentato dal requisito, per questo lì il bottone si vede
  // comunque. Lo segnaliamo invece di sparire silenziosamente, altrimenti
  // sembra un bottone dimenticato.
  const insecure = typeof window !== 'undefined' && window.isSecureContext === false
  const supported =
    !insecure &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'

  useEffect(
    () => () => {
      clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  if (!apiKey) return null
  if (!supported) {
    return (
      <p className="gms-voice-error">
        {insecure
          ? 'Dettatura non disponibile: serve una connessione sicura (https) — su questo indirizzo il browser blocca il microfono.'
          : 'Dettatura non disponibile su questo browser.'}
      </p>
    )
  }

  function stop() {
    clearInterval(timerRef.current)
    mediaRef.current?.stop()
  }

  async function transcribe(blob, mimeType) {
    setState('transcribing')
    setError('')
    try {
      const audioBase64 = await blobToBase64(blob)
      const text = await transcribeAudio(apiKey, { audioBase64, mimeType })
      onTranscribed(text)
      setLastRecording(null) // andata a buon fine: non serve più tenerlo
    } catch (err) {
      setLastRecording({ blob, mimeType }) // tenuto da parte per "Riprova"
      setError(describeGeminiError(err))
    } finally {
      setState('idle')
    }
  }

  function retryTranscription() {
    if (lastRecording) transcribe(lastRecording.blob, lastRecording.mimeType)
  }

  async function start() {
    setError('')
    setLastRecording(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mimeType || 'audio/webm' })
        transcribe(blob, rec.mimeType || mimeType || 'audio/webm')
      }
      mediaRef.current = rec
      rec.start()
      setSeconds(0)
      setState('recording')
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop()
          return s + 1
        })
      }, 1000)
    } catch {
      setError(
        Capacitor.isNativePlatform()
          ? 'Microfono non disponibile: consenti il permesso Microfono ad Annales dalle impostazioni del telefono (Impostazioni → App → Annales → Autorizzazioni).'
          : 'Microfono non disponibile: controlla i permessi del browser.',
      )
    }
  }

  return (
    <div className="gms-voice">
      {state === 'recording' ? (
        <button type="button" onClick={stop} className="gms-voice-btn recording">
          <Icon name="square" size={13} />
          Ferma · {seconds}s
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={disabled || state === 'transcribing'}
          className="gms-voice-btn"
        >
          <Icon name="mic" size={13} />
          {state === 'transcribing' ? 'Trascrivo…' : 'Detta un vocale'}
        </button>
      )}
      {error && (
        <p className="gms-voice-error">
          {error}
          {lastRecording && (
            <>
              {' '}
              <button type="button" onClick={retryTranscription} className="gms-voice-retry">
                Riprova la trascrizione (senza registrare di nuovo)
              </button>
            </>
          )}
        </p>
      )}
    </div>
  )
}
