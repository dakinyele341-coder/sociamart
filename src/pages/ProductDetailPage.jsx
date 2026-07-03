import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Pill from '../components/ui/Pill'
import Modal from '../components/ui/Modal'
import { VerifiedSellerBadge } from '../components/ui/Badge'
import { WhatsAppIcon, PinIcon } from '../components/icons'
import ProductCard from '../components/ProductCard'
import BuyWhatsAppModal from '../components/BuyWhatsAppModal'
import RequestItemSheet from '../components/RequestItemSheet'
import ReactionBar from '../components/ui/ReactionBar'
import KebabMenu from '../components/ui/KebabMenu'
import ReportSheet from '../components/ReportSheet'
import { useSocialProof } from '../hooks/useSocialProof'
import { formatNaira, formatDistance, timeAgo } from '../lib/format'
import { categoryLabel } from '../lib/categories'
import { useProduct, useRelatedProducts } from '../hooks/useProducts'
import { incrementViews } from '../lib/products'
import { logEvent } from '../lib/analytics'
import { track } from '../lib/posthog'
import { friendlyDbError } from '../lib/errors'
import { isFollowing, toggleFollow } from '../lib/social'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLocation as useGeo, geocodePlace } from '../context/LocationContext'
import { useToast } from '../context/ToastContext'
import { cn } from '../lib/cn'

function haversineKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { product, loading } = useProduct(id)
  const { products: related } = useRelatedProducts({ productId: id, category: product?.category })
  const { user } = useAuth()
  const { location } = useGeo()
  const toast = useToast()

  const [buyOpen, setBuyOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [following, setFollowing] = useState(false)
  const [reviews, setReviews] = useState([])
  const [hasBought, setHasBought] = useState(false)

  const seller = product?.seller || {}
  const { pillText } = useSocialProof(id)

  // Count a view once per mount.
  useEffect(() => {
    if (product?.id) {
      incrementViews(product.id)
      logEvent('product_view', { product_id: product.id, seller_id: product.seller_id })
      track('product_viewed', { product_id: product.id, seller_id: product.seller_id })
    }
  }, [product?.id, product?.seller_id])

  // Buyers who've tapped Buy can leave a review.
  useEffect(() => {
    try {
      setHasBought(localStorage.getItem(`sociamart.bought.${id}`) === '1')
    } catch { /* ignore */ }
  }, [id, buyOpen])

  // Follow state + reviews.
  useEffect(() => {
    let active = true
    if (user && product?.seller_id) isFollowing(user.id, product.seller_id).then((f) => active && setFollowing(f))
    if (isSupabaseConfigured && product?.seller_id) {
      supabase
        .from('reviews')
        .select('*, reviewer:reviewer_id(full_name, avatar_url)')
        .eq('seller_id', product.seller_id)
        .order('created_at', { ascending: false })
        .then(({ data }) => active && setReviews(data ?? []))
    }
    return () => { active = false }
  }, [user, product?.seller_id])

  const distanceKm = useMemo(() => {
    if (!location || !product) return null
    const place = geocodePlace(product.town)
    if (!place) return null
    return haversineKm({ lat: location.lat, lon: location.lon }, { lat: place.lat, lon: place.lon })
  }, [location, product])

  const onFollow = async () => {
    if (!user) return navigate('/auth', { state: { from: `/product/${id}` } })
    const next = await toggleFollow(user.id, product.seller_id, following)
    setFollowing(next)
  }

  const openBuy = () => {
    try { localStorage.setItem(`sociamart.bought.${id}`, '1') } catch { /* ignore */ }
    setBuyOpen(true)
  }

  if (loading) return <CenterShell><div className="h-8 w-8 animate-pulse rounded-full bg-navy/20" /></CenterShell>
  if (!product) return (
    <CenterShell>
      <p className="font-semibold">Product not found</p>
      <Button className="mt-3" onClick={() => navigate('/')}>Back to feed</Button>
    </CenterShell>
  )

  const rating = Number(seller.rating || 0)

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)] pb-28">
      {/* Floating back button over the gallery */}
      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        aria-label="Back"
        className="fixed left-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur tactile-press"
      >
        <span className="text-xl leading-none">‹</span>
      </button>
      <div className="fixed right-4 top-4 z-30">
        <KebabMenu onDark items={[{ label: 'Report', danger: true, onClick: () => setReportOpen(true) }]} />
      </div>

      <Gallery images={product.images} video={product.video_url} title={product.title} pillText={pillText} />

      <div className="space-y-5 px-4 pt-4">
        <div>
          <h1 className="text-xl font-extrabold font-display leading-tight">{product.title}</h1>
          <p className="mt-1 text-2xl font-extrabold font-display text-primary">{formatNaira(product.price)}</p>
        </div>

        {/* Reactions */}
        <ReactionBar productId={product.id} size="lg" />

        {/* Seller row */}
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <button onClick={() => navigate(`/seller/${product.seller_id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Avatar src={seller.avatar_url} name={seller.business_name || seller.full_name} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-semibold">{seller.business_name || seller.full_name || 'Seller'}</p>
                {seller.is_verified && <VerifiedSellerBadge />}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {rating > 0 ? `★ ${rating.toFixed(1)} · ${seller.rating_count || 0} reviews` : 'No reviews yet'}
              </p>
            </div>
          </button>
          <Button size="sm" variant={following ? 'outline' : 'primary'} onClick={onFollow}>
            {following ? 'Following' : 'Follow'}
          </Button>
        </div>

        {/* Location + category */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-navy/5 px-3 py-1.5 text-xs font-medium dark:bg-white/10">
            <PinIcon className="h-4 w-4 text-primary" />
            {product.town || 'Nearby'}{distanceKm != null && ` · ${formatDistance(distanceKm * 1000)}`}
          </span>
          {product.category && (
            <span className="rounded-full bg-navy/5 px-3 py-1.5 text-xs font-medium dark:bg-white/10">
              {categoryLabel(product.category)}
            </span>
          )}
        </div>

        {product.description && <CollapsibleText text={product.description} />}

        {/* Reviews */}
        <ReviewsSection
          reviews={reviews}
          rating={rating}
          count={seller.rating_count || 0}
          canWrite={hasBought}
          onWrite={() => (user ? setReviewOpen(true) : navigate('/auth', { state: { from: `/product/${id}` } }))}
        />

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="mb-2 font-bold font-display">More like this</h2>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {related.map((p) => (
                <div key={p.id} className="w-40 shrink-0">
                  <ProductCard product={p} onOpen={() => navigate(`/product/${p.id}`)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 backdrop-blur safe-bottom">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setRequestOpen(true)}>Request Item</Button>
          {product.is_available && (
            <Button className="flex-1" onClick={openBuy} leftIcon={<WhatsAppIcon className="h-5 w-5" />}>Buy on WhatsApp</Button>
          )}
        </div>
      </div>

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} productId={product.id} userId={product.seller_id} label="this product" />
      <BuyWhatsAppModal open={buyOpen} onClose={() => setBuyOpen(false)} product={product} />
      <RequestItemSheet open={requestOpen} onClose={() => setRequestOpen(false)} sellerId={product.seller_id} product={product} />
      <WriteReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        product={product}
        onSaved={(r) => setReviews((list) => [r, ...list])}
      />
    </div>
  )
}

function Gallery({ images = [], video, title, pillText }) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef(null)
  const slides = [...(video ? [{ video }] : []), ...images.map((src) => ({ src }))]
  if (slides.length === 0) slides.push({ src: null })

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className="relative">
      <div ref={trackRef} onScroll={onScroll} className="no-scrollbar flex aspect-square w-full snap-x snap-mandatory overflow-x-auto bg-navy/5">
        {slides.map((s, i) => (
          <div key={i} className="aspect-square w-full shrink-0 snap-center">
            {s.video ? (
              <VideoPlayer src={s.video} />
            ) : s.src ? (
              <img src={s.src} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-navy/20">
                <img src="/logo/logo-icon.svg" alt="" className="h-14 w-14 opacity-40" />
              </div>
            )}
          </div>
        ))}
      </div>
      {pillText && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {pillText}
        </div>
      )}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50')} />
          ))}
        </div>
      )}
    </div>
  )
}

function VideoPlayer({ src }) {
  const ref = useRef(null)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={ref}
        src={src}
        className="h-full w-full object-contain"
        autoPlay
        loop
        muted={muted}
        playsInline
        onTimeUpdate={(e) => {
          const v = e.currentTarget
          if (v.duration) setProgress((v.currentTime / v.duration) * 100)
        }}
      />
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white tactile-press"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function CollapsibleText({ text }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 160
  return (
    <div>
      <p className={cn('whitespace-pre-line text-[15px] leading-relaxed text-[var(--color-text-muted)]', !open && long && 'line-clamp-3')}>
        {text}
      </p>
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="mt-1 text-sm font-semibold text-primary tactile-press">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

function ReviewsSection({ reviews, rating, count, canWrite, onWrite }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold font-display">
          Reviews {count > 0 && <span className="text-[var(--color-text-muted)]">· ★ {rating.toFixed(1)} ({count})</span>}
        </h2>
        {canWrite && (
          <button onClick={onWrite} className="text-sm font-semibold text-primary tactile-press">Write a Review</button>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No reviews yet. Be the first after you buy.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2">
                <Avatar src={r.reviewer?.avatar_url} name={r.reviewer?.full_name} size="xs" />
                <span className="text-sm font-medium">{r.reviewer?.full_name || 'Buyer'}</span>
                <span className="ml-auto text-xs text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.comment && <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{r.comment}</p>}
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{timeAgo(r.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WriteReviewModal({ open, onClose, product, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!user) return
    setSaving(true)
    if (!isSupabaseConfigured) {
      setTimeout(() => { setSaving(false); toast.success('Review submitted!'); onClose() }, 400)
      return
    }
    const { data, error } = await supabase
      .from('reviews')
      .insert({ seller_id: product.seller_id, reviewer_id: user.id, product_id: product.id, rating, comment: comment.trim() || null })
      .select('*, reviewer:reviewer_id(full_name, avatar_url)')
      .single()
    setSaving(false)
    if (error) toast.error(error.message.includes('duplicate') ? 'You already reviewed this' : friendlyDbError(error, { action: 'review' }))
    else {
      track('review_submitted', { rating })
      toast.success('Thanks for your review!')
      onSaved?.(data)
      onClose()
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

function CenterShell({ children }) {
  return <div className="mx-auto grid min-h-[100dvh] max-w-md place-items-center px-6 text-center">{children}</div>
}
