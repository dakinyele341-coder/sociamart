import { useState, useRef } from 'react'
import { useNavigate, useLocation as useRouteLocation } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Pill from '../../components/ui/Pill'
import Toggle from '../../components/ui/Toggle'
import Confetti from '../../components/ui/Confetti'
import LeafletMap from '../../components/ui/LeafletMap'
import { PinIcon } from '../../components/icons'
import { CATEGORIES, categoryLabel } from '../../lib/categories'
import { formatNaira } from '../../lib/format'
import { compressImage, getVideoDuration } from '../../lib/media'
import { uploadImage } from '../../lib/storage'
import { createProduct, updateProduct, pointFromLocation } from '../../lib/products'
import { friendlyDbError } from '../../lib/errors'
import { isValidPrice } from '../../lib/validation'
import { useAuth } from '../../context/AuthContext'
import { useLocation, geocodePlace, nearestPlace } from '../../context/LocationContext'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../lib/cn'
import { track } from '../../lib/posthog'

const MAX_IMAGES = 5
const MAX_VIDEO_SECONDS = 60

let mediaSeq = 0

export default function SingleProductFlow() {
  const { user } = useAuth()
  const { location: profileLoc } = useLocation()
  const toast = useToast()
  const navigate = useNavigate()
  const editing = useRouteLocation().state?.product || null

  const [step, setStep] = useState(1)
  const [editingId] = useState(editing?.id ?? null)
  const [media, setMedia] = useState(() =>
    (editing?.images || []).map((url) => ({ id: ++mediaSeq, status: 'done', progress: 100, url, path: null, previewUrl: url }))
  )
  const [video, setVideo] = useState(() => (editing?.video_url ? { status: 'done', url: editing.video_url, previewUrl: editing.video_url } : null))
  const [details, setDetails] = useState({
    title: editing?.title || '',
    price: editing?.price != null ? String(editing.price) : '',
    category: editing?.category || '',
    description: editing?.description || '',
    available: editing?.is_available ?? true,
  })
  const [loc, setLoc] = useState(() => ({
    town: editing?.town || profileLoc?.town || '',
    state: editing?.state || profileLoc?.state || '',
    lat: profileLoc?.lat ?? null,
    lon: profileLoc?.lon ?? null,
  }))
  const [posting, setPosting] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const next = () => setStep((s) => Math.min(4, s + 1))
  const back = () => (step === 1 ? navigate(-1) : setStep((s) => s - 1))

  // --- Media handling ------------------------------------------------------
  const addImages = async (files) => {
    const room = MAX_IMAGES - media.length
    const picked = Array.from(files).slice(0, room)
    if (picked.length < files.length) toast.info(`Up to ${MAX_IMAGES} images`)

    for (const file of picked) {
      const id = ++mediaSeq
      const previewUrl = URL.createObjectURL(file)
      setMedia((m) => [...m, { id, status: 'compressing', progress: 0, previewUrl, url: null, path: null }])
      const compressed = await compressImage(file, (p) =>
        setMedia((m) => m.map((it) => (it.id === id ? { ...it, progress: Math.round(p) } : it)))
      )
      setMedia((m) => m.map((it) => (it.id === id ? { ...it, status: 'uploading', progress: 100 } : it)))
      const { url, path, error } = await uploadImage('product-images', user?.id, compressed)
      setMedia((m) =>
        m.map((it) => (it.id === id ? { ...it, status: error ? 'error' : 'done', url, path } : it))
      )
      if (error) toast.error('An image failed to upload')
    }
  }

  const addVideo = async (file) => {
    if (!file) return
    const duration = await getVideoDuration(file)
    if (duration > MAX_VIDEO_SECONDS + 1) {
      toast.error(`Video must be ${MAX_VIDEO_SECONDS}s or shorter`)
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setVideo({ status: 'uploading', previewUrl, url: null, duration })
    const { url, error } = await uploadImage('product-videos', user?.id, file)
    if (error) {
      toast.error('Video failed to upload')
      setVideo(null)
    } else {
      setVideo((v) => ({ ...v, status: 'done', url }))
    }
  }

  const moveImage = (index, dir) => {
    setMedia((m) => {
      const next = [...m]
      const target = index + dir
      if (target < 0 || target >= next.length) return m
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const removeImage = (id) => setMedia((m) => m.filter((it) => it.id !== id))

  const uploadedImages = media.filter((m) => m.status === 'done' && m.url)
  const anyUploading = media.some((m) => m.status === 'compressing' || m.status === 'uploading') || video?.status === 'uploading'

  // --- Validation per step -------------------------------------------------
  const canLeaveMedia = uploadedImages.length > 0 && !anyUploading
  const canLeaveDetails = details.title.trim() && isValidPrice(details.price) && details.category

  // --- Submit --------------------------------------------------------------
  const submit = async (asDraft) => {
    if (!user) {
      toast.info('Sign in to post')
      navigate('/auth', { state: { from: '/sell/single' } })
      return
    }
    setPosting(true)
    track(editingId ? 'product_update' : 'product_create', { mode: 'single', draft: asDraft })
    const payload = {
      title: details.title.trim(),
      price: Number(details.price),
      category: details.category,
      description: details.description.trim() || null,
      images: uploadedImages.map((m) => m.url),
      video_url: video?.url || null,
      is_available: details.available,
      status: asDraft ? 'draft' : 'active',
      town: loc.town || null,
      state: loc.state || null,
      location: pointFromLocation(loc),
    }
    const { data, error } = editingId
      ? await updateProduct(editingId, payload)
      : await createProduct({ seller_id: user.id, ...payload })
    setPosting(false)
    if (error) {
      toast.error(friendlyDbError(error, { action: 'product' }))
      return
    }
    if (!asDraft) {
      track('product_posted', {
        category: details.category,
        has_video: Boolean(video?.url),
        images_count: uploadedImages.length,
      })
    }
    if (asDraft) {
      toast.success('Saved as draft')
      navigate('/store')
      return
    }
    setCelebrate(true)
    setTimeout(() => navigate(`/product/${data.id}`), 1800)
  }

  if (celebrate) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <Confetti />
        <div className="animate-toast-in">
          <span className="text-6xl">🎉</span>
          <h1 className="mt-4 text-2xl font-extrabold font-display">Your product is live!</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <StepHeader step={step} total={4} onBack={back} title={['Add photos or a video', 'Product details', 'Where is this item?', 'Review & post'][step - 1]} />

      {step === 1 && (
        <MediaStep
          media={media}
          video={video}
          onAddImages={addImages}
          onAddVideo={addVideo}
          onMove={moveImage}
          onRemove={removeImage}
          onRemoveVideo={() => setVideo(null)}
        />
      )}

      {step === 2 && <DetailsStep details={details} setDetails={setDetails} />}

      {step === 3 && <LocationStep loc={loc} setLoc={setLoc} toast={toast} />}

      {step === 4 && (
        <ReviewStep
          details={details}
          loc={loc}
          cover={uploadedImages[0]?.url}
          imageCount={uploadedImages.length}
          hasVideo={Boolean(video?.url)}
        />
      )}

      {/* Footer actions */}
      {step < 4 ? (
        <Button
          fullWidth
          size="lg"
          disabled={(step === 1 && !canLeaveMedia) || (step === 2 && !canLeaveDetails)}
          onClick={next}
        >
          {step === 1 && anyUploading ? 'Uploading…' : 'Continue'}
        </Button>
      ) : (
        <div className="space-y-2">
          <Button fullWidth size="lg" loading={posting} onClick={() => submit(false)}>
            Post to SociaMart
          </Button>
          <Button fullWidth variant="outline" disabled={posting} onClick={() => submit(true)}>
            Save as Draft
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function StepHeader({ step, total, onBack, title }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy/5 dark:hover:bg-white/10 tactile-press">
          <span className="text-xl leading-none">‹</span>
        </button>
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy/10 dark:bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
          </div>
        </div>
        <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)]">{step}/{total}</span>
      </div>
      <h1 className="text-2xl font-extrabold font-display tracking-tight">{title}</h1>
    </div>
  )
}

function MediaStep({ media, video, onAddImages, onAddVideo, onMove, onRemove, onRemoveVideo }) {
  const imgInput = useRef(null)
  const vidInput = useRef(null)
  return (
    <div className="space-y-4">
      <button
        onClick={() => imgInput.current?.click()}
        className="grid w-full place-items-center gap-1 rounded-2xl border-2 border-dashed border-[var(--color-border)] py-10 text-center tactile-press"
      >
        <span className="text-3xl">📷</span>
        <span className="font-semibold">Tap to add photos</span>
        <span className="text-xs text-[var(--color-text-muted)]">Up to {MAX_IMAGES} images · first is the cover</span>
        <input ref={imgInput} type="file" accept="image/*" multiple hidden onChange={(e) => { onAddImages(e.target.files); e.target.value = '' }} />
      </button>

      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {media.map((m, i) => (
            <div key={m.id} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-navy/5">
              <img src={m.url || m.previewUrl} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">Cover</span>}

              {(m.status === 'compressing' || m.status === 'uploading') && (
                <div className="absolute inset-0 grid place-items-center bg-black/40">
                  <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full bg-white transition-all" style={{ width: `${m.status === 'uploading' ? 100 : m.progress}%` }} />
                  </div>
                </div>
              )}
              {m.status === 'error' && <div className="absolute inset-0 grid place-items-center bg-error/70 text-xs font-semibold text-white">Failed</div>}

              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                <div className="flex gap-1">
                  <IconBtn label="Move left" disabled={i === 0} onClick={() => onMove(i, -1)}>‹</IconBtn>
                  <IconBtn label="Move right" disabled={i === media.length - 1} onClick={() => onMove(i, 1)}>›</IconBtn>
                </div>
                <IconBtn label="Remove" onClick={() => onRemove(m.id)}>✕</IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Optional video */}
      {video ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)]">
          <video src={video.previewUrl || video.url} className="aspect-video w-full bg-black object-contain" muted controls />
          {video.status === 'uploading' && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-semibold text-white">Uploading video…</div>
          )}
          <button onClick={onRemoveVideo} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white tactile-press">✕</button>
        </div>
      ) : (
        <button onClick={() => vidInput.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-3 text-sm font-medium tactile-press">
          🎬 Add a video <span className="text-[var(--color-text-muted)]">(optional, ≤{MAX_VIDEO_SECONDS}s)</span>
          <input ref={vidInput} type="file" accept="video/*" hidden onChange={(e) => { onAddVideo(e.target.files?.[0]); e.target.value = '' }} />
        </button>
      )}
    </div>
  )
}

function IconBtn({ children, onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn('grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs font-bold text-white tactile-press', disabled && 'opacity-30')}
    >
      {children}
    </button>
  )
}

function DetailsStep({ details, setDetails }) {
  const set = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }))
  return (
    <div className="space-y-4">
      <Input label="Product name" placeholder="e.g. Nike Air Force 1 Size 42" value={details.title} onChange={set('title')} required />
      <Input label="Price" type="number" inputMode="numeric" prefix="₦" placeholder="0.00" value={details.price} onChange={set('price')} required />

      <div>
        <label className="mb-1.5 block text-sm font-medium">Category</label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {CATEGORIES.map((c) => (
            <Pill key={c.id} active={details.category === c.id} leftIcon={<span>{c.emoji}</span>} onClick={() => setDetails((d) => ({ ...d, category: c.id }))}>
              {c.label}
            </Pill>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Description</label>
        <textarea
          rows={4}
          maxLength={300}
          value={details.description}
          onChange={set('description')}
          placeholder="Tell buyers more about this item..."
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-right text-xs text-[var(--color-text-muted)] tabular-nums">{details.description.length}/300</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] p-3">
        <Toggle
          checked={details.available}
          onChange={(v) => setDetails((d) => ({ ...d, available: v }))}
          label="Available for sale"
          subtitle="Buyers will see a Buy button on this post"
        />
      </div>
    </div>
  )
}

function LocationStep({ loc, setLoc, toast }) {
  const { detectLocation, detecting, places } = useLocation()
  const [query, setQuery] = useState('')

  const detect = async () => {
    const r = await detectLocation()
    if (r) setLoc({ town: r.town, state: r.state, lat: r.lat, lon: r.lon })
    else toast.error('Could not detect location')
  }

  const search = (e) => {
    e.preventDefault()
    const p = geocodePlace(query)
    if (p) {
      setLoc({ town: p.town, state: p.state, lat: p.lat, lon: p.lon })
      setQuery('')
    } else toast.info('Town not found — try a suggestion')
  }

  // Dragging the map pin reverse-maps to the nearest known town.
  const onPin = (lat, lon) => {
    const p = nearestPlace(lat, lon)
    setLoc({ lat, lon, town: p?.town || loc.town, state: p?.state || loc.state })
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" fullWidth loading={detecting} onClick={detect} leftIcon={<PinIcon className="h-5 w-5 text-primary" />}>
        Use my current location
      </Button>

      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="City / area, e.g. Ibadan" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button type="submit" variant="secondary">Set</Button>
      </form>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {places.map((p) => (
          <Pill key={p.town} active={loc.town === p.town} onClick={() => setLoc({ town: p.town, state: p.state, lat: p.lat, lon: p.lon })}>
            {p.town}
          </Pill>
        ))}
      </div>

      <LeafletMap lat={loc.lat} lon={loc.lon} onChange={onPin} height={200} />

      {loc.town && (
        <p className="rounded-xl bg-primary/8 px-4 py-2.5 text-sm">
          📍 <span className="font-semibold">{loc.town}{loc.state ? `, ${loc.state}` : ''}</span>
        </p>
      )}
    </div>
  )
}

function ReviewStep({ details, loc, cover, imageCount, hasVideo }) {
  return (
    <div className="space-y-4">
      {/* Feed-card preview */}
      <div className="mx-auto w-44 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
        <div className="aspect-square bg-navy/5">
          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-navy/20">No photo</div>}
        </div>
        <div className="space-y-1 p-3">
          <p className="line-clamp-1 text-sm font-semibold">{details.title || 'Untitled'}</p>
          <p className="text-base font-extrabold font-display text-primary">{formatNaira(details.price || 0)}</p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">📍 {loc.town || 'Nearby'}</p>
        </div>
      </div>

      <dl className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] text-sm">
        <Row label="Photos" value={`${imageCount}${hasVideo ? ' + video' : ''}`} />
        <Row label="Title" value={details.title || '—'} />
        <Row label="Price" value={formatNaira(details.price || 0)} />
        <Row label="Category" value={details.category ? categoryLabel(details.category) : '—'} />
        <Row label="Location" value={loc.town || '—'} />
        <Row label="For sale" value={details.available ? 'Yes' : 'No'} />
      </dl>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}
