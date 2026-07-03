import { useState } from 'react'
import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

/** Picks a deterministic accent from the name so fallbacks feel distinct. */
const FALLBACKS = [
  'bg-primary/15 text-primary',
  'bg-verified/15 text-verified',
  'bg-success/15 text-success',
  'bg-navy/10 text-navy dark:bg-white/10 dark:text-white',
  'bg-amber-400/20 text-amber-600',
]

function pickFallback(name) {
  const key = (name || '?').charCodeAt(0) || 0
  return FALLBACKS[key % FALLBACKS.length]
}

export default function Avatar({ src, name, size = 'md', className, ...props }) {
  const [errored, setErrored] = useState(false)
  const showImage = src && !errored

  return (
    <span
      className={cn(
        'inline-grid place-items-center overflow-hidden rounded-full font-semibold font-display select-none',
        SIZES[size],
        !showImage && pickFallback(name),
        className
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || 'avatar'}
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}
