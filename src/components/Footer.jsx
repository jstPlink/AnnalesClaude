import { useState } from 'react'
import Icon from './Icon'
import { useAuth } from '../context/AuthContext'
import { fileUrl } from '../lib/pocketbase'
import { haptic } from '../lib/haptics'

// Pulsante circolare generico del footer, stile "cartoncino chiaro" — usato
// per le voci di `items` che non hanno un materiale dedicato (profilo,
// cerca: vedi sotto).
function PaperCircle({ icon, onClick, title, active }) {
  return (
    <button
      type="button"
      onClick={
        onClick
          ? (e) => {
              haptic()
              onClick(e)
            }
          : undefined
      }
      title={title}
      aria-label={title}
      className={'mcircle mcircle-paper' + (active ? ' active' : '')}
    >
      <Icon name={icon} size={20} />
    </button>
  )
}

// "Opzioni" (→ Profilo): non più un'icona a ingranaggio — la stessa tessera
// fotografica della barra laterale web, in formato circolare compatto.
function ProfileCircle({ onClick, title }) {
  const { user } = useAuth()
  const avatarUrl = user?.avatar ? fileUrl(user, user.avatar, { thumb: '96x96' }) : ''
  const initial = (user?.name?.trim() || user?.email || '?').charAt(0).toUpperCase()
  return (
    <button
      type="button"
      onClick={
        onClick
          ? (e) => {
              haptic()
              onClick(e)
            }
          : undefined
      }
      title={title}
      aria-label={title}
      className="mcircle mid-btn"
    >
      {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="mid-photo">{initial}</span>}
    </button>
  )
}

// "Filtri" (→ ricerca): lente d'ingrandimento in ottone, senza manico,
// icona al centro del vetro — stesso materiale della barra laterale web.
function SearchCircle({ onClick, title, active }) {
  return (
    <button
      type="button"
      onClick={
        onClick
          ? (e) => {
              haptic()
              onClick(e)
            }
          : undefined
      }
      title={title}
      aria-label={title}
      className={'mcircle msearch-btn' + (active ? ' active' : '')}
    >
      <Icon name="search" size={18} strokeWidth={2.6} />
    </button>
  )
}

// Footer con pulsanti circolari: a sinistra fino a 3 voci opzionali
// `items` ({ icon, onClick, title, active }), a destra l'azione principale.
// Le voci non passate non occupano spazio (nessun placeholder). "settings"
// e "search" hanno un materiale dedicato (tessera/lente); le altre restano
// un ritaglio di carta generico.
export default function Footer({
  items = [],
  onPrimary,
  primaryIcon = 'plus',
  primaryTitle,
  onSecondary,
  secondaryIcon,
  secondaryTitle,
}) {
  const visible = items.filter(Boolean)
  const [popPrimary, setPopPrimary] = useState(false)

  return (
    <div className="mfooter">
      <div className="mfooter-group">
        {visible.map((it, i) =>
          it.icon === 'settings' ? (
            <ProfileCircle key={it.title ?? i} onClick={it.onClick} title={it.title} />
          ) : it.icon === 'search' ? (
            <SearchCircle key={it.title ?? i} onClick={it.onClick} title={it.title} active={it.active} />
          ) : (
            <PaperCircle
              key={it.title ?? i}
              icon={it.icon}
              onClick={it.onClick}
              title={it.title}
              active={it.active}
            />
          ),
        )}
      </div>
      <div className="mfooter-group">
        {onSecondary && (
          <button
            type="button"
            onClick={() => {
              haptic()
              onSecondary()
            }}
            title={secondaryTitle}
            aria-label={secondaryTitle}
            className="mcircle mgemini"
          >
            <Icon name={secondaryIcon} size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={
            onPrimary
              ? () => {
                  haptic()
                  setPopPrimary(false)
                  requestAnimationFrame(() => setPopPrimary(true))
                  onPrimary()
                }
              : undefined
          }
          onAnimationEnd={() => setPopPrimary(false)}
          title={primaryTitle}
          aria-label={primaryTitle}
          className={'mcircle mfab' + (popPrimary ? ' anim-pop' : '')}
        >
          <Icon name={primaryIcon} size={24} />
        </button>
      </div>
    </div>
  )
}
