import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'

/**
 * Small ⋯ menu. `items`: [{ label, onClick, danger }]. Renders a trigger button
 * and a popover; closes on outside click / Escape.
 */
export default function KebabMenu({ items = [], className, onDark = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen((o) => !o)
        }}
        aria-label="More options"
        className={cn(
          'grid h-8 w-8 place-items-center rounded-full tactile-press',
          onDark ? 'bg-black/45 text-white backdrop-blur' : 'text-[var(--color-text-muted)] hover:bg-navy/5 dark:hover:bg-white/10'
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lift animate-fade-in">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setOpen(false)
                item.onClick?.()
              }}
              className={cn(
                'block w-full px-4 py-2.5 text-left text-sm font-medium tactile-press',
                item.danger ? 'text-error hover:bg-error/5' : 'text-[var(--color-text)] hover:bg-navy/5 dark:hover:bg-white/10'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
