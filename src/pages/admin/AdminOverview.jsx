import { useState, useEffect } from 'react'
import { getOverview } from '../../lib/admin'

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOverview().then((d) => { setStats(d || {}); setLoading(false) })
  }, [])

  const cards = [
    { label: 'Total users', value: stats?.total_users, sub: `${stats?.buyers ?? 0} buyers · ${stats?.sellers ?? 0} sellers` },
    { label: 'New today', value: stats?.new_today, sub: `${stats?.new_week ?? 0} this week` },
    { label: 'Products', value: stats?.total_products },
    { label: 'Active sellers (30d)', value: stats?.active_sellers },
    { label: 'WhatsApp taps', value: stats?.whatsapp_taps },
    { label: 'Product requests', value: stats?.total_requests },
    { label: 'Reviews', value: stats?.total_reviews },
    { label: 'New feedback', value: stats?.feedback_new, badge: stats?.feedback_new > 0 },
    { label: 'Pending verifications', value: stats?.pending_verifications, badge: stats?.pending_verifications > 0 },
    { label: 'Pending reports', value: stats?.pending_reports, badge: stats?.pending_reports > 0 },
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold font-display">Overview</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-start justify-between">
              <p className="text-3xl font-extrabold font-display text-primary">{loading ? '…' : (c.value ?? 0)}</p>
              {c.badge ? <span className="h-2.5 w-2.5 rounded-full bg-error" /> : null}
            </div>
            <p className="mt-1 text-sm font-medium">{c.label}</p>
            {c.sub && <p className="text-xs text-[var(--color-text-muted)]">{c.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
