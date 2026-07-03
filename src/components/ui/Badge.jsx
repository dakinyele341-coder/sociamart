import { cn } from '../../lib/cn'

const TONES = {
  verified: 'bg-verified/10 text-verified',
  success: 'bg-success/10 text-success',
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-navy/8 text-navy dark:bg-white/10 dark:text-white',
  warning: 'bg-amber-400/15 text-amber-600',
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function Badge({ children, tone = 'neutral', icon, className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        TONES[tone],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
}

/** Pre-built badges per the design spec. */
export function VerifiedSellerBadge() {
  return <Badge tone="verified" icon={<CheckIcon />}>Verified Seller</Badge>
}

export function VerifiedBuyerBadge() {
  return <Badge tone="success" icon={<CheckIcon />}>Verified Buyer</Badge>
}

export function NewSellerBadge() {
  return <Badge tone="primary">New Seller</Badge>
}
