import { useEffect } from 'react'
import { cn } from '../../lib/cn'

/** Centered modal dialog with backdrop. Esc + backdrop click to close. */
export default function Modal({ open, onClose, title, children, footer, className }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl bg-[var(--color-surface)] shadow-lift',
          'animate-toast-in border border-[var(--color-border)]',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="text-lg font-bold font-display">{title}</h2>
            <CloseButton onClick={onClose} />
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="border-t border-[var(--color-border)] px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function CloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-text-muted)] hover:bg-navy/5 dark:hover:bg-white/10"
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M6.3 6.3a1 1 0 011.4 0L10 8.6l2.3-2.3a1 1 0 111.4 1.4L11.4 10l2.3 2.3a1 1 0 01-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 01-1.4-1.4L8.6 10 6.3 7.7a1 1 0 010-1.4z" />
      </svg>
    </button>
  )
}
