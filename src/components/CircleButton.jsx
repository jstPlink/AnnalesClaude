import { haptic } from '../lib/haptics'

const VARIANTS = {
  light: 'bg-tag text-ink border border-line hover:brightness-[0.98]',
  sand: 'bg-sand text-ink border border-line hover:brightness-[0.98]',
  save: 'bg-save text-ink border border-save-dark hover:brightness-105',
  delete: 'bg-delete text-ink border border-delete-dark hover:brightness-105',
}

export default function CircleButton({
  children,
  onClick,
  size = 56,
  variant = 'light',
  disabled = false,
  title,
  className = '',
  type = 'button',
}) {
  return (
    <button
      type={type}
      onClick={
        onClick
          ? (e) => {
              haptic()
              onClick(e)
            }
          : undefined
      }
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{ width: size, height: size }}
      className={
        'inline-flex shrink-0 items-center justify-center rounded-full ' +
        'shadow-sm transition active:scale-95 disabled:opacity-40 ' +
        'disabled:active:scale-100 ' +
        (VARIANTS[variant] ?? VARIANTS.light) +
        ' ' +
        className
      }
    >
      {children}
    </button>
  )
}
