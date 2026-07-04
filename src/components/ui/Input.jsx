import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

/**
 * Text input with label, hint, and error states.
 * Pass `prefix` (e.g. "+234") to render an inline adornment.
 */
const Input = forwardRef(function Input(
  { label, hint, error, prefix, leftIcon, rightIcon, type = 'text', className, id, required, ...props },
  ref
) {
  const autoId = useId()
  const inputId = id || autoId
  const invalid = Boolean(error)

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </label>
      )}
      <div
        className={cn(
          'flex items-center rounded-xl border bg-[var(--color-surface)] transition-colors',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          invalid
            ? 'border-error focus-within:border-error focus-within:ring-error/20'
            : 'border-[var(--color-border)]'
        )}
      >
        {leftIcon && <span className="pl-3 text-[var(--color-text-muted)]">{leftIcon}</span>}
        {prefix && (
          <span className="pl-3 pr-1 text-[15px] font-medium text-[var(--color-text-muted)] select-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={invalid}
          className={cn(
            'h-11 w-full bg-transparent px-3 text-[15px] text-[var(--color-text)]',
            'placeholder:text-[var(--color-text-muted)]/70 outline-none rounded-xl',
            prefix && 'pl-1',
            className
          )}
          {...props}
        />
        {rightIcon && <span className="pr-1 text-[var(--color-text-muted)]">{rightIcon}</span>}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-error">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  )
})

export default Input
