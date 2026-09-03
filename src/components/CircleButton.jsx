const VARIANTS = {
  light: 'bg-[#efe9df] text-ink border border-line hover:bg-[#e7e0d3]',
  sand: 'bg-sand text-ink border border-line hover:bg-[#dcd4c4]',
  save: 'bg-save text-white border border-save-dark hover:brightness-105',
  delete: 'bg-delete text-white border border-delete-dark hover:brightness-105',
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
      onClick={onClick}
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
