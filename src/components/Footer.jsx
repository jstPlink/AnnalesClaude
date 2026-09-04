import CircleButton from './CircleButton'
import Icon from './Icon'

// Footer con quattro pulsanti circolari.
// `items`: fino a 3 voci { icon, onClick, title, active } per i pulsanti a
// sinistra; gli slot non passati restano decorativi/disabilitati.
// L'ultimo pulsante (in basso a destra) è sempre l'azione principale.
export default function Footer({
  items = [],
  onPrimary,
  primaryIcon = 'plus',
  primaryTitle,
}) {
  return (
    <footer className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-sand px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      {[0, 1, 2].map((i) => {
        const it = items[i]
        if (!it) {
          return (
            <CircleButton
              key={i}
              variant="light"
              disabled
              title="Non ancora disponibile"
            >
              <span className="block h-2 w-2 rounded-full bg-line" />
            </CircleButton>
          )
        }
        return (
          <CircleButton
            key={i}
            variant={it.active ? 'active' : 'light'}
            onClick={it.onClick}
            title={it.title}
          >
            <Icon name={it.icon} size={22} />
          </CircleButton>
        )
      })}
      <CircleButton variant="light" onClick={onPrimary} title={primaryTitle}>
        <Icon name={primaryIcon} size={26} />
      </CircleButton>
    </footer>
  )
}
