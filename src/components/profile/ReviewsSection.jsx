import { useState, useEffect } from 'react'
import Avatar from '../ui/Avatar'
import { timeAgo } from '../../lib/format'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { cn } from '../../lib/cn'

/** Star-rating breakdown + review list, with an optional "Write a Review" CTA. */
export default function ReviewsSection({ sellerId, rating = 0, ratingCount = 0, onWrite, canWrite = true }) {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    let active = true
    if (isSupabaseConfigured && sellerId) {
      supabase
        .from('reviews')
        .select('*, reviewer:reviewer_id(full_name, business_name, avatar_url)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .then(({ data }) => active && setReviews(data ?? []))
    }
    return () => { active = false }
  }, [sellerId])

  // Breakdown counts per star (1–5).
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))
  const total = reviews.length || ratingCount || 0

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold font-display">Reviews</h2>
        {canWrite && onWrite && (
          <button onClick={onWrite} className="text-sm font-semibold text-primary tactile-press">Write a Review</button>
        )}
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] p-4">
        <div className="text-center">
          <p className="text-3xl font-extrabold font-display">{Number(rating || 0).toFixed(1)}</p>
          <p className="text-amber-400">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{ratingCount || total} reviews</p>
        </div>
        <div className="flex-1 space-y-1">
          {breakdown.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="w-3 text-xs text-[var(--color-text-muted)]">{star}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
              </div>
              <span className="w-5 text-right text-xs text-[var(--color-text-muted)]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={cn('mt-3 space-y-3')}>
        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2">
                <Avatar src={r.reviewer?.avatar_url} name={r.reviewer?.business_name || r.reviewer?.full_name} size="xs" />
                <span className="text-sm font-medium">{r.reviewer?.business_name || r.reviewer?.full_name || 'Buyer'}</span>
                <span className="ml-auto text-xs text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.comment && <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{r.comment}</p>}
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{timeAgo(r.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
