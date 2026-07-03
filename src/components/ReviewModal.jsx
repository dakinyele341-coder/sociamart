import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { friendlyDbError } from '../lib/errors'
import { track } from '../lib/posthog'

/** Write/submit a review for a seller (optionally tied to a product). */
export default function ReviewModal({ open, onClose, sellerId, productId = null, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!user) {
      onClose()
      navigate('/auth', { state: { from: `/seller/${sellerId}` } })
      return
    }
    setSaving(true)
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setSaving(false)
        toast.success('Review submitted!')
        onClose()
      }, 400)
      return
    }
    const { data, error } = await supabase
      .from('reviews')
      .insert({ seller_id: sellerId, reviewer_id: user.id, product_id: productId, rating, comment: comment.trim() || null })
      .select('*, reviewer:reviewer_id(full_name, avatar_url)')
      .single()
    setSaving(false)
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'You already reviewed this seller' : friendlyDbError(error, { action: 'review' }))
    } else {
      track('review_submitted', { rating })
      toast.success('Thanks for your review!')
      onSaved?.(data)
      onClose()
      setComment('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Write a review">
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} className="text-3xl tactile-press">
              <span className={n <= rating ? 'text-amber-400' : 'text-navy/20 dark:text-white/20'}>★</span>
            </button>
          ))}
        </div>
        <textarea
          rows={4}
          maxLength={300}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button fullWidth loading={saving} onClick={submit}>Submit review</Button>
      </div>
    </Modal>
  )
}
