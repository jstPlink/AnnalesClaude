import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { goBack, registerOverlay } from '../lib/navStack'

// Funzione «indietro» per i pulsanti freccia dell'app: risale la pila di
// navigazione (vedi lib/navStack.js). Se non c'è nulla sotto (aperta da un
// link o appena avviata) va a `fallback`, di solito il calendario.
export function useGoBack(fallback = '/') {
  const navigate = useNavigate()
  return useCallback(() => {
    if (goBack(navigate) === 'root') navigate(fallback, { replace: true })
  }, [navigate, fallback])
}

// Registra un pannello (selettore, Gemini, immagini...) mentre è aperto:
// «indietro» lo chiude prima di cambiare pagina.
export function useBackClose(open, onClose) {
  const ref = useRef(onClose)
  useEffect(() => {
    ref.current = onClose
  })
  useEffect(() => {
    if (!open) return
    return registerOverlay(() => ref.current?.())
  }, [open])
}
