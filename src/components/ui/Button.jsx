import { cn } from '../../lib/cn'

const VARIANTS = {
  primary:
    'bg-primary text-white hover:bg-primary-dark shadow-soft disabled:bg-primary/60',
  secondary:
    'bg-navy text-white hover:bg-navy/90 disabled:bg-navy/60',
  ghost:
    'bg-transparent text-navy hover:bg-navy/5 dark:text-white dark:hover:bg-white/10',
  outline:
    'bg-transparent border border-[var(--color-border)] text-[var(--color-text)] hover:bg-navy/5 dark:hover:bg-white/5',
  danger:
    'bg-error text-white hover:bg-error/90 disabled:bg-error/60',
}

const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-13 px-6 text-base gap-2.5',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  className,
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl font-semibold font-display',
        'tactile-press select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-90',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
      <span className={cn('inline-flex items-center', SIZES[size].includes('gap') && 'gap-2', loading && 'opacity-0')}>
        {leftIcon}
        {children}
        {rightIcon}
      </span>
    </button>
  )
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-current" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  )
}
