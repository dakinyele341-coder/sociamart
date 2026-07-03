import { useState, useEffect } from 'react'
import { getOverview } from '../../lib/admin'

const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.posthog.com'
const TRACKED = [
  'user_signed_up', 'onboarding_completed', 'product_posted', 'product_viewed',
  'whatsapp_tap', 'filter_applied', 'search_performed', 'seller_followed',
  'review_submitted', 'request_sent', 'feedback_submitted', 'product_saved',
]

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null)
  useEffect(() => { getOverview().then(setStats) }, [])

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold font-display">Analytics</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="WhatsApp taps" value={stats?.whatsapp_taps} />
        <Metric label="Requests" value={stats?.total_requests} />
        <Metric label="Reviews" value={stats?.total_reviews} />
        <Metric label="Active sellers (30d)" value={stats?.active_sellers} />
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-bold font-display">Product analytics in PostHog</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          DAU/WAU/MAU, top pages, feature usage and retention (day 1/7/30) live in your PostHog
          project. Open the dashboard to slice by date range and cohort.
        </p>
        <a href={HOST} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white tactile-press">
          Open PostHog ↗
        </a>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-bold font-display">Events tracked</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {TRACKED.map((e) => (
            <span key={e} className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium dark:bg-white/10">{e}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-3xl font-extrabold font-display text-primary">{value ?? '…'}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
    </div>
  )
}
