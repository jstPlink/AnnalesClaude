import { Capacitor, registerPlugin } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

// Permessi dell'app per Impostazioni → Permessi (PermissionsSettings.jsx).
// Nell'app Android li legge il plugin nativo `AppPermissions` (vedi
// android/.../AppPermissionsPlugin.java): lo stato vero di Android, non quello
// che la WebView crede. Nel browser (PWA) c'è solo la Permissions API, per
// microfono e notifiche, in sola lettura.

const AppPermissions = registerPlugin('AppPermissions')

export const permissionsNative = () => Capacitor.isNativePlatform()

async function webState(name) {
  try {
    const s = await navigator.permissions.query({ name })
    return s.state // granted | denied | prompt
  } catch {
    return 'unknown'
  }
}

// { microphone, notifications, gyroscope, exactAlarms, exactAlarmsNeeded, batteryUnrestricted }
//  - microphone: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown'
//  - gli altri: booleani (null = non applicabile nel browser)
export async function readPermissions() {
  if (permissionsNative()) return { native: true, ...(await AppPermissions.status()) }
  const notif = typeof Notification !== 'undefined' ? Notification.permission : 'unknown'
  return {
    native: false,
    microphone: await webState('microphone'),
    notifications: notif === 'granted' ? true : notif === 'denied' ? false : null,
    gyroscope: typeof DeviceOrientationEvent === 'undefined' ? false : null, // null = lo si scopre solo quando arriva un evento
    exactAlarmsNeeded: false,
    exactAlarms: null,
    batteryUnrestricted: null,
  }
}

export async function requestMicrophone() {
  return AppPermissions.requestMicrophone()
}

// Android 13+: prima il permesso di sistema; se è già stato negato in modo
// definitivo la richiesta non compare più e serve la schermata delle notifiche.
export async function requestNotifications() {
  try {
    await LocalNotifications.requestPermissions()
  } catch {
    /* si ricontrolla lo stato sotto */
  }
  return AppPermissions.status()
}

export const openAppSettings = () => AppPermissions.openSettings()
export const openNotificationSettings = () => AppPermissions.openNotificationSettings()
export const openExactAlarmSettings = () => AppPermissions.openExactAlarmSettings()
export const openBatterySettings = () => AppPermissions.openBatterySettings()
