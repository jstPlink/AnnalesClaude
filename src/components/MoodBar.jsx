import { moodColor } from '../lib/mood'

// Barra verticale colorata: rappresenta la media dei mood di un giorno.
export default function MoodBar({ value, className = '' }) {
  return (
    <div
      className={'w-2 shrink-0 self-stretch rounded-full ' + className}
      style={{ backgroundColor: moodColor(value) }}
      title={`Umore medio: ${Number(value).toFixed(2)}`}
    />
  )
}
