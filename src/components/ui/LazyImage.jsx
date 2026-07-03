import { useState } from 'react'
import { cn } from '../../lib/cn'

/**
 * Image with a gray placeholder that fades in once loaded. Lazy by default.
 * Falls back to a logo glyph when `src` is missing or errors.
 */
export default function LazyImage({ src, alt = '', className, imgClassName, ...props }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const show = src && !errored

  return (
    <div className={cn('relative overflow-hidden bg-navy/5 dark:bg-white/5', className)} {...props}>
      {!loaded && show && <div className="absolute inset-0 animate-pulse bg-navy/10 dark:bg-white/10" />}
      {show ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn('h-full w-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0', imgClassName)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-navy/20 dark:text-white/20">
          <img src="/logo/logo-icon.svg" alt="" className="h-10 w-10 opacity-40" />
        </div>
      )}
    </div>
  )
}
