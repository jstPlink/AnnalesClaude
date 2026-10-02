import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

// Promemoria periodici "scrivi la nota del giorno" (solo app Android).
// Salvati sul dispositivo (localStorage) e programmati come notifiche locali
// ripetute: funzionano anche ad app chiusa e senza rete.
//   { id, time: 'HH:MM', days: [0..6] (0 = domenica), enabled }

const KEY = 'annales.reminders'
const CHANNEL = 'reminders'
export const DAY_LABELS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export const remindersSupported = () => Capacitor.isNativePlatform()

export function loadReminders() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage non disponibile */
  }
}

export function newReminder(list) {
  const id = list.reduce((m, r) => Math.max(m, r.id), 0) + 1
  return { id, time: '21:00', days: ALL_DAYS, enabled: true }
}

// Un id di notifica per promemoria (ogni giorno) o per giorno della settimana.
const notifId = (reminderId, weekday) => reminderId * 10 + (weekday ?? 8)

export async function ensurePermission() {
  let p = await LocalNotifications.checkPermissions()
  if (p.display === 'prompt' || p.display === 'prompt-with-rationale') {
    p = await LocalNotifications.requestPermissions()
  }
  return p.display === 'granted'
}

// Riallinea le notifiche programmate con l'elenco salvato.
export async function applyReminders(list) {
  save(list)
  if (!remindersSupported()) return true
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    })
  }
  const active = list.filter((r) => r.enabled && r.days.length)
  if (!active.length) return true
  if (!(await ensurePermission())) return false
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: 'Promemoria nota del giorno',
    importance: 4,
  }).catch(() => {})

  const notifications = []
  for (const r of active) {
    const [hour, minute] = r.time.split(':').map(Number)
    const base = {
      title: 'Annales',
      body: 'Com’è andata oggi? Scrivi la nota del giorno.',
      channelId: CHANNEL,
      extra: { newNote: true },
    }
    if (r.days.length === 7) {
      notifications.push({
        ...base,
        id: notifId(r.id),
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      })
    } else {
      for (const d of r.days) {
        notifications.push({
          ...base,
          id: notifId(r.id, d),
          // Capacitor: 1 = domenica ... 7 = sabato
          schedule: { on: { weekday: d + 1, hour, minute }, allowWhileIdle: true },
        })
      }
    }
  }
  await LocalNotifications.schedule({ notifications })
  return true
}
