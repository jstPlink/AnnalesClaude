// Barra superiore mobile, skin "Pagine": due fogli di cartoncino
// sovrapposti (stessi materiali della barra laterale web, in orizzontale)
// — quello dietro (.mtop-under) spunta appena, con un bordo seghettato
// irregolare; quello davanti (.mtop) porta il contenuto vero.
export default function MobileTopBar({ children, className = '', ...rest }) {
  return (
    <div className="sticky top-0 mtop-wrap">
      <div className="mtop-under" aria-hidden="true" />
      <div className={'mtop ' + className} {...rest}>
        {children}
      </div>
    </div>
  )
}
