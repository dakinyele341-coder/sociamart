import { useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import Pill from '../../../components/ui/Pill'
import { CATEGORIES } from '../../../lib/categories'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { uploadImage } from '../../../lib/storage'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'
import { track } from '../../../lib/posthog'

/** Final seller step: post a first product (or skip). Calls onDone() when finished. */
export default function StepFirstProduct({ data, onDone, onBack, onSkip }) {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ title: '', price: '', category: '' })
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const pickImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4)
    if (!files.length) return
    setUploading(true)
    const urls = []
    for (const file of files) {
      const { url, error } = await uploadImage('product-images', user?.id, file)
      if (url) urls.push(url)
      else if (error) toast.error(error.message)
    }
    setImages((prev) => [...prev, ...urls].slice(0, 4))
    setUploading(false)
  }

  const publish = async () => {
    if (!form.title.trim() || !form.price || !form.category) {
      toast.error('Add a title, price, and category')
      return
    }
    setSubmitting(true)
    track('onboarding_first_product')

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setSubmitting(false)
        onDone()
      }, 600)
      return
    }

    const { error } = await supabase.from('products').insert({
      seller_id: user.id,
      title: form.title.trim(),
      price: Number(form.price),
      category: form.category,
      images,
      town: data.town,
      state: data.state,
      location: data.location || null,
    })
    setSubmitting(false)
    if (error) toast.error(error.message)
    else onDone()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-4xl">🚀</span>
          <h2 className="mt-3 text-2xl font-extrabold font-display tracking-tight">Add your first product</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Get discovered by buyers near you.</p>
        </div>
        <button onClick={onSkip} className="shrink-0 pt-1 text-sm font-semibold text-[var(--color-text-muted)] tactile-press">
          Skip
        </button>
      </div>

      {/* Image uploader */}
      <div>
        <div className="grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded-xl border border-[var(--color-border)]">
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
          {images.length < 4 && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-[var(--color-border)] text-2xl text-[var(--color-text-muted)] tactile-press">
              {uploading ? '…' : '+'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={pickImages} disabled={uploading} />
            </label>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Up to 4 photos</p>
      </div>

      <Input label="Title" placeholder="e.g. Ankara Two-Piece Set" value={form.title} onChange={set('title')} required />
      <Input label="Price" type="number" inputMode="numeric" prefix="₦" placeholder="0" value={form.price} onChange={set('price')} required />

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

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button fullWidth size="lg" loading={submitting} onClick={publish}>Publish & finish</Button>
      </div>
    </div>
  )
}
