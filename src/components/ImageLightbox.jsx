import { useEffect } from 'react'
import Icon from './Icon'
import { haptic } from '../lib/haptics'

// Visualizzatore di immagini a schermo intero, con navigazione tra più
// immagini. `images`: [{ url, key }]. `index` null = chiuso.
export default function ImageLightbox({ images = [], index, onClose, onIndex }) {
  const open = index != null && images[index]

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'ArrowLeft') onIndex?.((index - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') onIndex?.((index + 1) % images.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, index, images.length, onClose, onIndex])

  if (!open) return null

  const go = (delta) => {
    haptic()
    onIndex?.((index + delta + images.length) % images.length)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        type="button"
        title="Chiudi"
        onClick={onClose}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 rounded-full bg-black/50 p-2 text-white active:scale-95"
      >
        <Icon name="x" size={20} />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            title="Precedente"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            className="absolute left-2 z-10 rounded-full bg-black/50 p-2 text-white active:scale-95"
          >
            <Icon name="chevron-left" size={22} />
          </button>
          <button
            type="button"
            title="Successiva"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            className="absolute right-2 z-10 rounded-full bg-black/50 p-2 text-white active:scale-95"
          >
            <Icon name="chevron-right" size={22} />
          </button>
        </>
      )}

      <img
        src={images[index].url}
        alt=""
        className="max-h-[88vh] max-w-[92vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
