// Barra inferiore mobile, skin "Pagine": stessa idea di MobileTopBar
// ribaltata — il foglio dietro (.mbottom-under) spunta dal bordo in alto.
export default function MobileBottomBar({ children, className = '' }) {
  return (
    <div className="sticky bottom-0 mbottom-wrap">
      <div className="mbottom-under" aria-hidden="true" />
      <div className={'mbottom ' + className}>{children}</div>
    </div>
  )
}
