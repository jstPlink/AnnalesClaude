import { useEffect, useState } from 'react'

// Carosello automatico in loop. Se non ci sono immagini non renderizza nulla
// (lo spazio resta vuoto, come da specifica).
export default function ImageCarousel({
  images = [],
  size = 72,
  interval = 2600,
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
      className={'relative shrink-0 overflow-hidden rounded-2xl bg-panel-2 ' + className}
      style={{ width: size, height: size }}
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
