/** Formatting helpers: currency (NGN), distance, relative time. */

const ngn = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

/** ₦12,500 — Nigerian Naira, no decimals by default. */
export function formatNaira(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₦0'
  return ngn.format(n)
}

/** Compact price for cards: ₦1.2k, ₦3.4m */
export function formatNairaCompact(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₦0'
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`
  return `₦${n.toLocaleString('en-NG')}`
}

/** Human-friendly distance from metres. */
export function formatDistance(metres) {
  const m = Number(metres)
  if (!Number.isFinite(m)) return ''
  if (m < 1000) return `${Math.round(m)}m away`
  const km = m / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km away`
}

/** "2h ago", "3d ago", etc. */
export function timeAgo(date) {
  if (!date) return ''
  const then = new Date(date).getTime()
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

/** Uppercase initials for avatar fallbacks. */
export function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}
