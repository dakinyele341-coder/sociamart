import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from './ui/Sheet'
import Input from './ui/Input'
import Button from './ui/Button'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../context/LocationContext'
import { useToast } from '../context/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { pointFromLocation } from '../lib/products'
import { friendlyDbError } from '../lib/errors'
import { track } from '../lib/posthog'

/**
 * Bottom sheet for posting a buyer request. If `sellerId`/`product` are given,
 * the request is addressed to that seller (who gets a realtime toast).
 */
export default function RequestItemSheet({ open, onClose, sellerId = null, product = null }) {
  const { user } = useAuth()
  const { location } = useLocation()
  const toast = useToast()
  const navigate = useNavigate()
  const [title, setTitle] = useState(product ? product.title : '')
  const [budget, setBudget] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Tell us what you are looking for')
      return
    }
    if (!user) {
      onClose()
      navigate('/auth', { state: { from: '/explore' } })
      return
    }
    setSubmitting(true)
    track('request_sent', { seller_id: sellerId })

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setSubmitting(false)
        toast.success('Request sent! The seller will be in touch.')
        reset()
        onClose()
      }, 500)
      return
    }

    const { error } = await supabase.from('product_requests').insert({
      buyer_id: user.id,
      seller_id: sellerId,
      title: title.trim(),
      category: product?.category || null,
      budget_max: budget ? Number(budget) : null,
      town: location?.town || null,
      state: location?.state || null,
      location: pointFromLocation(location),
    })
    setSubmitting(false)
    if (error) toast.error(friendlyDbError(error, { action: 'request' }))
    else {
      toast.success('Request sent! The seller will be in touch.')
      reset()
      onClose()
    }
  }

  const reset = () => {
    setTitle(product ? product.title : '')
    setBudget('')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Request an item">
      <form onSubmit={submit} className="space-y-4">
        <Input label="What are you looking for?" placeholder="e.g. Size 42 men's loafers" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        <Input label="Your budget" type="number" inputMode="numeric" prefix="₦" placeholder="Optional" value={budget} onChange={(e) => setBudget(e.target.value)} />
        <Button type="submit" fullWidth size="lg" loading={submitting}>Send Request</Button>
      </form>
    </Sheet>
  )
}
