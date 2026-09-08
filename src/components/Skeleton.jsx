// Blocco segnaposto animato (riflesso che scorre) per gli stati di
// caricamento. La classe `.skeleton` è definita in src/index.css e rispetta
// l'impostazione Animazioni.
export default function Skeleton({ className = '', style }) {
  return (
    <div className={'skeleton ' + className} style={style} aria-hidden="true" />
  )
}
