import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Pill from '../../components/ui/Pill'
import Toggle from '../../components/ui/Toggle'
import Confetti from '../../components/ui/Confetti'
import { PinIcon } from '../../components/icons'
import { CATEGORIES } from '../../lib/categories'
import { formatNaira } from '../../lib/format'
import { compressImage } from '../../lib/media'
import { uploadImage } from '../../lib/storage'
import { createProduct, pointFromLocation } from '../../lib/products'
import { useAuth } from '../../context/AuthContext'
import { useLocation, geocodePlace } from '../../context/LocationContext'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../lib/cn'
import { track } from '../../lib/posthog'

const MAX_PHOTOS = 20
let seq = 0

export default function BulkImportFlow() {
  const { user } = useAuth()
  const { location: profileLoc } = useLocation()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [items, setItems] = useState([]) // { id, file, previewUrl, name, price, category, status, productId }
  const [batch, setBatch] = useState(() => ({
    town: profileLoc?.town || '',
    state: profileLoc?.state || '',
    lat: profileLoc?.lat ?? null,
    lon: profileLoc?.lon ?? null,
    available: true,
  }))
  const [publishing, setPublishing] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const back = () => (step === 1 ? navigate(-1) : setStep((s) => s - 1))

  const pickPhotos = (files) => {
    const picked = Array.from(files).slice(0, MAX_PHOTOS)
    if (files.length > MAX_PHOTOS) toast.info(`Up to ${MAX_PHOTOS} photos`)
    setItems(
      picked.map((file) => ({
        id: ++seq,
        file,
        previewUrl: URL.createObjectURL(file),
        name: '',
        price: '',
        category: '',
        status: 'pending',
        productId: null,
      }))
    )
  }

  const patchItem = (id, patch) => setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const removeItem = (id) => setItems((arr) => arr.filter((it) => it.id !== id))

  const doneCount = items.filter((it) => it.name.trim() && Number(it.price) > 0).length
  const allValid = items.length > 0 && doneCount === items.length

  const publishAll = async () => {
    if (!user) {
      navigate('/auth', { state: { from: '/sell/bulk' } })
      return
    }
    setPublishing(true)
    track('product_create', { mode: 'bulk', count: items.length })

    // Upload + create each item (as draft first, then flip live), one at a time.
    for (const it of items) {
      if (it.status === 'done') continue
      patchItem(it.id, { status: 'uploading' })
      const compressed = await compressImage(it.file)
      const { url, error: upErr } = await uploadImage('product-images', user.id, compressed)
      if (upErr || !url) {
        patchItem(it.id, { status: 'error' })
        continue
      }
      const { data, error } = await createProduct({
        seller_id: user.id,
        title: it.name.trim(),
        price: Number(it.price),
        category: it.category || 'other',
        images: [url],
        is_available: batch.available,
        status: 'active',
        town: batch.town || null,
        state: batch.state || null,
        location: pointFromLocation(batch),
      })
      patchItem(it.id, error ? { status: 'error' } : { status: 'done', productId: data.id })
    }

    setPublishing(false)
    const failed = items.filter((it) => it.status === 'error').length
    if (failed === 0) {
      setCelebrate(true)
      setTimeout(() => navigate('/store'), 1900)
    } else {
      toast.error(`${failed} item(s) failed — retry below`)
    }
  }

  if (celebrate) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <Confetti />
        <div className="animate-toast-in">
          <span className="text-6xl">🎉</span>
          <h1 className="mt-4 text-2xl font-extrabold font-display">{items.length} products are live!</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Header step={step} onBack={back} />

      {step === 1 && <SelectStep items={items} onPick={pickPhotos} onContinue={() => setStep(2)} />}
      {step === 2 && (
        <QuickEditStep items={items} patchItem={patchItem} removeItem={removeItem} doneCount={doneCount} allValid={allValid} onContinue={() => setStep(3)} />
      )}
      {step === 3 && <BatchSettingsStep batch={batch} setBatch={setBatch} toast={toast} onContinue={() => setStep(4)} />}
      {step === 4 && (
        <PublishStep items={items} publishing={publishing} onPublish={publishAll} />
      )}
    </div>
  )
}

function Header({ step, onBack }) {
  const titles = ['Select your product photos', 'Quick edit', 'Batch settings', 'Publish all']
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy/5 dark:hover:bg-white/10 tactile-press">
          <span className="text-xl leading-none">‹</span>
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
        <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)]">{step}/4</span>
      </div>
      <h1 className="text-2xl font-extrabold font-display tracking-tight">{titles[step - 1]}</h1>
    </div>
  )
}

function SelectStep({ items, onPick, onContinue }) {
  const input = useRef(null)
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">Each photo becomes one draft product you can quick-edit next.</p>
      <button onClick={() => input.current?.click()} className="grid w-full place-items-center gap-1 rounded-2xl border-2 border-dashed border-[var(--color-border)] py-12 tactile-press">
        <span className="text-3xl">🖼️</span>
        <span className="font-semibold">Select photos</span>
        <span className="text-xs text-[var(--color-text-muted)]">Up to {MAX_PHOTOS} at once</span>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { onPick(e.target.files); e.target.value = '' }} />
      </button>

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2">
            {items.map((it) => (
              <div key={it.id} className="aspect-square overflow-hidden rounded-lg border border-[var(--color-border)]">
                <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <p className="text-center text-sm font-medium">
            {items.length} photo{items.length > 1 ? 's' : ''} selected → {items.length} product{items.length > 1 ? 's' : ''} will be created
          </p>
          <Button fullWidth size="lg" onClick={onContinue}>Continue</Button>
        </>
      )}
    </div>
  )
}

function QuickEditStep({ items, patchItem, removeItem, doneCount, allValid, onContinue }) {
  if (items.length === 0) return <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">No photos left. Go back to add some.</p>
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{doneCount} of {items.length} done</p>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {items.map((it) => (
          <div key={it.id} className="w-[80vw] max-w-[320px] shrink-0 snap-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="relative aspect-square bg-navy/5">
              <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
              <button onClick={() => removeItem(it.id)} className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white tactile-press">Skip</button>
            </div>
            <div className="space-y-3 p-3">
              <Input placeholder="Product name" value={it.name} onChange={(e) => patchItem(it.id, { name: e.target.value })} />
              <Input type="number" inputMode="numeric" prefix="₦" placeholder="Price" value={it.price} onChange={(e) => patchItem(it.id, { price: e.target.value })} />
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                {CATEGORIES.map((c) => (
                  <Pill key={c.id} active={it.category === c.id} onClick={() => patchItem(it.id, { category: c.id })} className="px-3 py-1.5 text-xs">
                    {c.emoji}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button fullWidth size="lg" disabled={!allValid} onClick={onContinue}>
        {allValid ? 'Done' : `Fill name & price (${doneCount}/${items.length})`}
      </Button>
    </div>
  )
}

function BatchSettingsStep({ batch, setBatch, toast, onContinue }) {
  const { detectLocation, detecting } = useLocation()
  const [query, setQuery] = useState('')
  const detect = async () => {
    const r = await detectLocation()
    if (r) setBatch((b) => ({ ...b, town: r.town, state: r.state, lat: r.lat, lon: r.lon }))
    else toast.error('Could not detect location')
  }
  const search = (e) => {
    e.preventDefault()
    const p = geocodePlace(query)
    if (p) { setBatch((b) => ({ ...b, town: p.town, state: p.state, lat: p.lat, lon: p.lon })); setQuery('') }
    else toast.info('Town not found')
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">These settings apply to all products in this batch.</p>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Location</label>
        {batch.town && <p className="mb-2 rounded-xl bg-primary/8 px-3 py-2 text-sm">📍 <span className="font-semibold">{batch.town}{batch.state ? `, ${batch.state}` : ''}</span></p>}
        <div className="flex gap-2">
          <form onSubmit={search} className="flex flex-1 gap-2">
            <Input placeholder="City / area" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button type="submit" variant="secondary">Set</Button>
          </form>
        </div>
        <Button variant="outline" fullWidth className="mt-2" loading={detecting} onClick={detect} leftIcon={<PinIcon className="h-5 w-5 text-primary" />}>
          Use my current location
        </Button>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] p-3">
        <Toggle checked={batch.available} onChange={(v) => setBatch((b) => ({ ...b, available: v }))} label="Available for sale" subtitle="Applies to all items in this batch" />
      </div>

      <Button fullWidth size="lg" onClick={onContinue}>Continue</Button>
    </div>
  )
}

function PublishStep({ items, publishing, onPublish }) {
  const done = items.filter((it) => it.status === 'done').length
  const failed = items.filter((it) => it.status === 'error').length
  const hasFailed = failed > 0
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{items.length} products ready to post</p>

      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.id} className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-navy/5">
            <div className="aspect-square">
              <img src={it.previewUrl} alt="" className={cn('h-full w-full object-cover', it.status === 'error' && 'opacity-40')} />
            </div>
            <div className="p-1.5">
              <p className="line-clamp-1 text-[11px] font-semibold">{it.name || 'Untitled'}</p>
              <p className="text-[11px] font-bold text-primary">{formatNaira(it.price || 0)}</p>
            </div>
            {it.status === 'uploading' && <div className="absolute inset-0 grid place-items-center bg-black/40 text-[10px] font-semibold text-white">Uploading…</div>}
            {it.status === 'done' && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-success text-[11px] text-white">✓</span>}
            {it.status === 'error' && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-error text-[11px] text-white">!</span>}
          </div>
        ))}
      </div>

      {(publishing || done > 0) && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-navy/10 dark:bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-[var(--color-text-muted)]">{done}/{items.length} published{failed ? ` · ${failed} failed` : ''}</p>
        </div>
      )}

      <Button fullWidth size="lg" loading={publishing} onClick={onPublish}>
        {hasFailed ? 'Retry Failed' : 'Publish All'}
      </Button>
    </div>
  )
}
