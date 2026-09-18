import { useState } from 'react'
import Icon from './Icon'

// Sezione delle Impostazioni (web e mobile, stesse classi CSS scalate via
// @media (max-width: 480px)): intestazione a "cartoncino a quadretti"
// colorato, larga quanto la sezione, con icona+titolo insieme (stesso
// motivo dell'intestazione della vista giorno). `nested` = un
// sotto-cartoncino più piccolo (stessa materia di carta, grana+fibra, non
// più un bordo colorato per categoria) per un singolo gruppo di parametri
// dentro la sezione. `noCollapse` = sempre visibile, senza freccia (usato
// per "Elimina account": non è mai stata una sezione richiudibile).
export default function SettingsSection({
  title,
  icon,
  nested = false,
  danger = false,
  noCollapse = false,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (nested) {
    return (
      <div className="ws-sub">
        {noCollapse ? (
          <div className="ws-sub-head">
            {icon && <Icon name={icon} size={15} className="ws-sub-icon shrink-0" />}
            <span className="ws-sub-title">{title}</span>
          </div>
        ) : (
          <button type="button" onClick={() => setOpen((v) => !v)} className="ws-sub-head">
            {icon && <Icon name={icon} size={15} className="ws-sub-icon shrink-0" />}
            <span className="ws-sub-title">{title}</span>
            <Icon
              name="chevron-right"
              size={14}
              className={'ws-sub-chev shrink-0' + (open ? ' ws-sub-chev-open' : '')}
            />
          </button>
        )}
        {(noCollapse || open) && <div className="ws-sub-body">{children}</div>}
      </div>
    )
  }

  const headerCls = 'ws-header' + (danger ? ' ws-header-danger' : '')
  const headerContent = (
    <>
      {icon && <Icon name={icon} size={22} className="ws-icon shrink-0" />}
      <span className="ws-htext">
        <span className="ws-title">{title}</span>
      </span>
      {!noCollapse && (
        <Icon
          name="chevron-right"
          size={16}
          className={'ws-chev shrink-0' + (open ? ' ws-chev-open' : '')}
        />
      )}
    </>
  )

  return (
    <div className="ws-section">
      {noCollapse ? (
        <div className={headerCls}>{headerContent}</div>
      ) : (
        <button type="button" onClick={() => setOpen((v) => !v)} className={headerCls}>
          {headerContent}
        </button>
      )}
      {(noCollapse || open) && <div className="ws-card">{children}</div>}
    </div>
  )
}
