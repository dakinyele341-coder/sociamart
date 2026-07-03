import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

/** Initialise PostHog once, only when a key is provided. */
export function initAnalytics() {
  if (initialized || !key) return
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // we capture manually on route change
    persistence: 'localStorage+cookie',
    autocapture: true,
  })
  initialized = true
}

/** Track a named event with optional properties. No-op until initialised. */
export function track(event, properties = {}) {
  if (!initialized) return
  posthog.capture(event, properties)
}

/** Associate subsequent events with a signed-in user. */
export function identify(userId, traits = {}) {
  if (!initialized || !userId) return
  posthog.identify(userId, traits)
}

/** Clear identity on sign-out. */
export function resetAnalytics() {
  if (!initialized) return
  posthog.reset()
}

export { posthog }
