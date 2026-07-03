import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { CloseButton } from './Modal'

/**
 * Bottom drawer for mobile filters and actions.
 * Supports swipe-to-dismiss via the grab handle / drag on the sheet body.
 */
export default function Sheet({ open, onClose, title, children, footer, className }) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef(null)

  useEffect(() => {
    if (!open) {
      setDragY(0)
      return
    }
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY
  }
  const onTouchMove = (e) => {
    if (startY.current == null) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) setDragY(delta)
  }
  const onTouchEnd = () => {
    if (dragY > 100) onClose?.()
    else setDragY(0)
    startY.current = null
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
        className={cn(
          'relative z-10 w-full max-w-md rounded-t-3xl bg-[var(--color-surface)] shadow-lift',
          'border-t border-[var(--color-border)] animate-sheet-up safe-bottom',
          dragY === 0 && 'transition-transform',
          className
        )}
      >
        {/* Grab handle — primary swipe target */}
        <div
          className="flex cursor-grab touch-none flex-col items-center pt-3 pb-1 active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="h-1.5 w-10 rounded-full bg-navy/15 dark:bg-white/20" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 pt-1">
            <h2 className="text-lg font-bold font-display">{title}</h2>
            <CloseButton onClick={onClose} />
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-[var(--color-border)] px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}
