import { useEffect, useState } from 'react'

// Carosello automatico in loop. Se non ci sono immagini non renderizza nulla
// (lo spazio resta vuoto, come da specifica).
// `size` imposta un riquadro quadrato; in alternativa `width`/`height`
// permettono un rettangolo (es. immagine a tutta altezza di una riga).
export default function ImageCarousel({
  images = [],
  size = 72,
  width,
  height,
  interval = 2600,
  rounded = 'rounded-2xl',
  className = '',
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
    if (images.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length)
    }, interval)
    return () => clearInterval(id)
  }, [images, interval])

  if (!images.length) return null

  return (
    <div
      className={
        'relative shrink-0 overflow-hidden bg-panel-2 ' + rounded + ' ' + className
      }
      style={{ width: width ?? size, height: height ?? size }}
    >
      {images.map((img, i) => (
        <img
          key={img.url + i}
          src={img.url}
          alt={img.alt || ''}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  )
}
