import { cn } from '../../lib/cn'

/** Selectable filter / category chip. */
export default function Pill({ active = false, children, className, leftIcon, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium',
        'tactile-press whitespace-nowrap transition-colors border',
        active
          ? 'bg-navy text-white border-navy'
          : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:border-navy/30',
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  )
}
