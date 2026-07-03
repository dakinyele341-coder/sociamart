import { cn } from '../../lib/cn'

/** Accessible on/off switch with optional label + subtitle. */
export default function Toggle({ checked, onChange, label, subtitle, disabled = false }) {
  const sw = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors tactile-press',
        checked ? 'bg-primary' : 'bg-navy/20 dark:bg-white/20',
        disabled && 'opacity-50'
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )

  if (!label) return sw

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
        {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
      {sw}
    </div>
  )
}
