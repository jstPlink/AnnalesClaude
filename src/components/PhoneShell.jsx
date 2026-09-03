// Contenitore "telefono": colonna centrata a larghezza massima ~440px.
// Funziona a tutto schermo su mobile e centrato su desktop.
export default function PhoneShell({ children, className = '' }) {
  return (
    <div className="min-h-dvh w-full flex justify-center bg-[#d8d2c4]">
      <div
        className={
          'relative flex w-full max-w-[440px] flex-col bg-cream shadow-xl ' +
          'min-h-dvh overflow-hidden ' +
          className
        }
      >
        {children}
      </div>
    </div>
  )
}
