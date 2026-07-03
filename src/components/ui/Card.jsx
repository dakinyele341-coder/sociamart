import { cn } from '../../lib/cn'

/**
 * Surface container with the signature tactile lift on hover/tap.
 * Set `interactive={false}` for static surfaces (e.g. forms).
 */
export default function Card({ as: Tag = 'div', interactive = true, className, children, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-soft',
        interactive && 'tactile-card cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  )
}
