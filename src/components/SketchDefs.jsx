// Filtro SVG condiviso per l'effetto "disegnato a mano" delle skin: sposta
// leggermente i pixel con del rumore, così bordi e righe risultano tremolanti
// e irregolari. Montato una volta in App, invisibile e senza impatto sul
// layout. Il CSS lo richiama con `filter: url(#annales-wob)`.
export default function SketchDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <filter
          id="annales-wob"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Variante a onda più larga: deforma i bordi di un intero foglio
            (skin "pagine") per farlo sembrare tagliato a mano e un po'
            vissuto. Richiamata con `filter: url(#annales-paper)`. */}
        <filter
          id="annales-paper"
          x="-6%"
          y="-6%"
          width="112%"
          height="112%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011 0.015"
            numOctaves="2"
            seed="4"
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
