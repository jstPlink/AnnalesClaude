import CircleButton from './CircleButton'
import Icon from './Icon'

// Footer con pulsanti circolari: a sinistra fino a 3 voci opzionali
// `items` ({ icon, onClick, title, active }), a destra l'azione principale.
// Le voci non passate non occupano spazio (nessun placeholder).
export default function Footer({
  items = [],
  onPrimary,
  primaryIcon = 'plus',
  primaryTitle,
  onSecondary,
  secondaryIcon,
  secondaryTitle,
  sticky = true,
}) {
  const visible = items.filter(Boolean)
  return (
    <footer
      className={
        (sticky ? 'sticky bottom-0 z-20 ' : '') +
        'flex items-center justify-between gap-3 border-t border-line bg-sand px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3'
      }
    >
      <div className="flex items-center gap-3">
        {visible.map((it, i) => (
          <CircleButton
            key={it.title ?? i}
            variant={it.active ? 'active' : 'light'}
            onClick={it.onClick}
            title={it.title}
          >
            <Icon name={it.icon} size={22} />
          </CircleButton>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {onSecondary && (
          <CircleButton variant="active" onClick={onSecondary} title={secondaryTitle}>
            <Icon name={secondaryIcon} size={20} />
          </CircleButton>
        )}
        <CircleButton variant="light" onClick={onPrimary} title={primaryTitle}>
          <Icon name={primaryIcon} size={26} />
        </CircleButton>
      </div>
    </footer>
  )
}
