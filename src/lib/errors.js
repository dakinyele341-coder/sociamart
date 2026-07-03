import { logEvent } from './analytics'

const RATE_MESSAGES = {
  rate_limit_products: "You've hit today's limit of 10 new products. Try again tomorrow.",
  rate_limit_reviews: "You've hit today's limit of 5 reviews.",
  rate_limit_requests: "You've hit today's limit of 20 requests.",
  account_suspended: 'Your account is suspended. Contact support.',
}

export function isRateLimit(error) {
  return /rate_limit_/.test(error?.message || '')
}

/** Map raw DB/trigger errors to friendly copy and log rate-limit hits. */
export function friendlyDbError(error, context = {}) {
  const msg = error?.message || ''
  for (const key of Object.keys(RATE_MESSAGES)) {
    if (msg.includes(key)) {
      if (key.startsWith('rate_limit')) logEvent('rate_limit_hit', { kind: key, ...context })
      return RATE_MESSAGES[key]
    }
  }
  if (msg.includes('duplicate')) return 'This already exists.'
  return msg || 'Something went wrong'
}
