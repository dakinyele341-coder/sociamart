import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Pill from '../components/ui/Pill'
import Card, { CardBody } from '../components/ui/Card'
import { CATEGORIES } from '../lib/categories'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../context/LocationContext'
import { useToast } from '../context/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { track } from '../lib/posthog'

const TABS = [
  { id: 'sell', label: 'Sell an item' },
  { id: 'request', label: 'Request an item' },
]

export default function SellPage() {
  const [tab, setTab] = useState('sell')
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display tracking-tight">List on SociaMart</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} className="flex-1 justify-center">
            {t.label}
          </Pill>
        ))}
      </div>

      {tab === 'sell' ? <SellForm /> : <RequestForm />}
    </div>
  )
}

function SellForm() {
  const { user } = useAuth()
  const { location } = useLocation()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', price: '', category: '', description: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Give your item a clear title'
    if (!form.price || Number(form.price) <= 0) e.price = 'Enter a valid price'
    if (!form.category) e.category = 'Pick a category'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    if (!user) {
      toast.info('Sign in to publish your listing')
      navigate('/auth', { state: { from: '/sell' } })
      return
    }
    setSubmitting(true)
    track('product_create_attempt', { category: form.category })

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setSubmitting(false)
        toast.success('Demo: listing captured (connect Supabase to publish)')
        setForm({ title: '', price: '', category: '', description: '' })
      }, 700)
      return
    }

    const { error } = await supabase.from('products').insert({
      seller_id: user.id,
      title: form.title.trim(),
      price: Number(form.price),
      category: form.category,
      description: form.description.trim(),
      town: location?.town,
      state: location?.state,
      location: location ? `POINT(${location.lon} ${location.lat})` : null,
    })
    setSubmitting(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Listing published!')
      setForm({ title: '', price: '', category: '', description: '' })
    }
  }

  return (
    <Card interactive={false}>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Item title" placeholder="e.g. Ankara Two-Piece Set" required value={form.title} onChange={set('title')} error={errors.title} />
          <Input label="Price" type="number" inputMode="numeric" prefix="₦" placeholder="0" required value={form.price} onChange={set('price')} error={errors.price} />

          <div>
            <label className="mb-1.5 block text-sm font-medium">Category <span className="text-primary">*</span></label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Pill key={c.id} active={form.category === c.id} leftIcon={<span>{c.emoji}</span>} onClick={() => setForm((f) => ({ ...f, category: c.id }))}>
                  {c.label}
                </Pill>
              ))}
            </div>
            {errors.category && <p className="mt-1.5 text-xs font-medium text-error">{errors.category}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={set('description')}
              placeholder="Condition, size, pickup details…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">
            📍 Listing in <span className="font-semibold text-[var(--color-text)]">{location?.town || 'your area'}</span>. Buyers reach you on WhatsApp.
          </p>

          <Button type="submit" fullWidth loading={submitting}>Publish listing</Button>
        </form>
      </CardBody>
    </Card>
  )
}

function RequestForm() {
  const { user } = useAuth()
  const { location } = useLocation()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', budget: '', category: '' })
  const [submitting, setSubmitting] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Describe what you need')
      return
    }
    if (!user) {
      toast.info('Sign in to post a request')
      navigate('/auth', { state: { from: '/sell' } })
      return
    }
    setSubmitting(true)
    track('request_create_attempt')

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setSubmitting(false)
        toast.success('Demo: request captured (connect Supabase to broadcast)')
        setForm({ title: '', budget: '', category: '' })
      }, 700)
      return
    }

    const { error } = await supabase.from('product_requests').insert({
      buyer_id: user.id,
      title: form.title.trim(),
      category: form.category || null,
      budget_max: form.budget ? Number(form.budget) : null,
      town: location?.town,
      state: location?.state,
      location: location ? `POINT(${location.lon} ${location.lat})` : null,
    })
    setSubmitting(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Request posted — sellers will reach out!')
      setForm({ title: '', budget: '', category: '' })
    }
  }

  return (
    <Card interactive={false}>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <Input label="What do you need?" placeholder="e.g. Size 42 men's loafers" required value={form.title} onChange={set('title')} />
          <Input label="Max budget" type="number" inputMode="numeric" prefix="₦" placeholder="Optional" value={form.budget} onChange={set('budget')} />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Pill key={c.id} active={form.category === c.id} leftIcon={<span>{c.emoji}</span>} onClick={() => setForm((f) => ({ ...f, category: c.id }))}>
                  {c.label}
                </Pill>
              ))}
            </div>
          </div>
          <Button type="submit" fullWidth loading={submitting}>Broadcast request</Button>
        </form>
      </CardBody>
    </Card>
  )
}
