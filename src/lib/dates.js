// Utility per date in italiano e per il formato datetime di PocketBase.
//
// Scelta di progetto: le date/orari del diario sono trattati come "ora da
// calendario" (wall clock), senza conversioni di fuso. Un'attività alle 10:35
// resta alle 10:35. Per questo salviamo e leggiamo sempre la stringa
// "YYYY-MM-DD HH:mm:00.000Z" prendendone letteralmente i pezzi.

export const MONTHS_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]

// getDay(): 0 = domenica ... 6 = sabato
export const WEEKDAYS_SHORT_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/

// Estrae { y, mo, d, h, mi } da una stringa data/datetime. mo è 1–12.
export function parseWall(value) {
  if (!value) return null
  const m = String(value).match(WALL_RE)
  if (!m) return null
  return {
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    h: m[4] != null ? Number(m[4]) : 0,
    mi: m[5] != null ? Number(m[5]) : 0,
  }
}

const pad = (n) => String(n).padStart(2, '0')

// Chiave giorno "YYYY-MM-DD" da una data qualsiasi (record PB o Date).
export function dayKey(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  const p = parseWall(value)
  return p ? `${p.y}-${pad(p.mo)}-${pad(p.d)}` : ''
}

export function todayKey() {
  return dayKey(new Date())
}

// "HH.mm" per la UI (come nel mockup: 10.35).
export function timeLabel(value) {
  const p = parseWall(value)
  if (!p) return ''
  return `${pad(p.h)}.${pad(p.mi)}`
}

// "HH:mm" per <input type="time">.
export function timeInputValue(value) {
  const p = parseWall(value)
  if (!p) return ''
  return `${pad(p.h)}:${pad(p.mi)}`
}

// I campi timeStart/timeEnd della collection contengono solo l'orario: la data
// è un segnaposto fisso. Va rispettata questa convenzione, altrimenti
// l'ordinamento per timeStart (stringa) mischia note nuove e vecchie.
export const TIME_PLACEHOLDER_DATE = '2000-01-01'

// Costruisce il valore "orario" da salvare su PocketBase ("2000-01-01 HH:mm:00.000Z").
export function toPbTime(hhmm) {
  const [h = '00', mi = '00'] = (hhmm || '00:00').split(':')
  return `${TIME_PLACEHOLDER_DATE} ${pad(Number(h))}:${pad(Number(mi))}:00.000Z`
}

// Minuti dell'attività. Se la fine è prima dell'inizio si assume il giorno dopo.
export function durationMinutes(start, end) {
  const a = parseWall(start)
  const b = parseWall(end)
  if (!a || !b) return 0
  let mins = (b.h * 60 + b.mi) - (a.h * 60 + a.mi)
  if (mins < 0) mins += 24 * 60
  return mins
}

// "20 Settembre"
export function dayMonthLabel(dKey) {
  const p = parseWall(dKey)
  if (!p) return ''
  return `${p.d} ${MONTHS_IT[p.mo - 1]}`
}

export function weekdayShort(dKey) {
  const p = parseWall(dKey)
  if (!p) return ''
  const dt = new Date(p.y, p.mo - 1, p.d)
  return WEEKDAYS_SHORT_IT[dt.getDay()]
}

// true se il giorno è sabato o domenica.
export function isWeekend(dKey) {
  const p = parseWall(dKey)
  if (!p) return false
  const wd = new Date(p.y, p.mo - 1, p.d).getDay()
  return wd === 0 || wd === 6
}

// Primo e ultimo istante di un mese, per filtrare i record.
// month è 0–11.
export function monthRange(year, month) {
  const start = `${year}-${pad(month + 1)}-01 00:00:00.000Z`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${pad(month + 1)}-${pad(lastDay)} 23:59:59.999Z`
  return { start, end }
}

export function dayRange(dKey) {
  return {
    start: `${dKey} 00:00:00.000Z`,
    end: `${dKey} 23:59:59.999Z`,
  }
}

// Confini [start, end] da due chiavi giorno "YYYY-MM-DD" (una o entrambe
// possono mancare: nessun limite su quel lato).
export function dateRangeBounds(fromKey, toKey) {
  return {
    start: fromKey ? `${fromKey} 00:00:00.000Z` : undefined,
    end: toKey ? `${toKey} 23:59:59.999Z` : undefined,
  }
}

// "HH:mm" dell'orario attuale arrotondato ai 5 minuti più vicini.
export function nowRoundedTo5() {
  const d = new Date()
  let h = d.getHours()
  let mi = Math.round(d.getMinutes() / 5) * 5
  if (mi === 60) {
    mi = 0
    h = (h + 1) % 24
  }
  return `${pad(h)}:${pad(mi)}`
}

// Sottrae `hours` ore a un "HH:mm", avvolgendo sul giorno precedente.
export function subtractHours(hhmm, hours) {
  const [h = '0', mi = '0'] = (hhmm || '00:00').split(':')
  let total = Number(h) * 60 + Number(mi) - hours * 60
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

// Aggiunge n mesi a { year, month(0–11) }.
export function addMonths({ year, month }, n) {
  const total = year * 12 + month + n
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

// Elenco di chiavi giorno "YYYY-MM-DD" per tutti i giorni del mese. month è 0–11.
export function monthDayKeys(year, month) {
  const last = new Date(year, month + 1, 0).getDate()
  const mm = pad(month + 1)
  return Array.from({ length: last }, (_, i) => `${year}-${mm}-${pad(i + 1)}`)
}

// Griglia calendario di 6 settimane (42 celle) che copre il mese, da lunedì.
// Ogni cella: { key: "YYYY-MM-DD", inMonth, weekday (0=dom..6=sab) }.
export function calendarGrid(year, month) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // lunedì = primo giorno
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i,
    )
    return {
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      inMonth: d.getMonth() === month,
      weekday: d.getDay(),
    }
  })
}

// "Martedì 1 Settembre 2026"
const WEEKDAYS_FULL_IT = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
]
export function fullDayLabel(dKey) {
  const p = parseWall(dKey)
  if (!p) return ''
  const dt = new Date(p.y, p.mo - 1, p.d)
  return `${WEEKDAYS_FULL_IT[dt.getDay()]} ${p.d} ${MONTHS_IT[p.mo - 1]} ${p.y}`
}
