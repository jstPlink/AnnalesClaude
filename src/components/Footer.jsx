import CircleButton from './CircleButton'
import Icon from './Icon'

// Footer con quattro pulsanti circolari. Per ora funziona solo quello in
// basso a destra; gli altri tre sono decorativi.
export default function Footer({ onPrimary, primaryIcon = 'plus', primaryTitle }) {
  return (
    <footer className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-sand px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      {[0, 1, 2].map((i) => (
        <CircleButton
          key={i}
          variant="light"
          disabled
          title="Non ancora disponibile"
        >
          <span className="block h-2 w-2 rounded-full bg-line" />
        </CircleButton>
      ))}
      <CircleButton variant="light" onClick={onPrimary} title={primaryTitle}>
        <Icon name={primaryIcon} size={26} />
      </CircleButton>
    </footer>
  )
}
