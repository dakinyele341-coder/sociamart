import { cn } from '../../lib/cn'

/** Pulse + shimmer placeholder block. */
export default function Skeleton({ className, rounded = 'rounded-lg', ...props }) {
  return (
    <div
      className={cn(
        'skeleton-shimmer animate-pulse bg-navy/8 dark:bg-white/10',
        rounded,
        className
      )}
      {...props}
    />
  )
}

/** Matches the ProductCard layout for loading states. */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-2">
      <Skeleton className="aspect-square w-full" rounded="rounded-xl" />
      <div className="space-y-2 p-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  )
}

/** Profile header loading state. */
export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-20 w-20" rounded="rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
