import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from './ui/Avatar'
import Button from './ui/Button'
import { VerifiedSellerBadge } from './ui/Badge'
import { WhatsAppIcon, PinIcon } from './icons'
import BuyWhatsAppModal from './BuyWhatsAppModal'
import CommentsSheet from './ui/CommentsSheet'
import { formatNaira, formatDistance, timeAgo } from '../lib/format'
import { cn } from '../lib/cn'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { toggleSave } from '../lib/saves'
import { toggleFollow } from '../lib/social'
import { commentCount as fetchCommentCount } from '../lib/comments'
import { shareProduct } from '../lib/share'
import { logEvent } from '../lib/analytics'
import ReactionBar from './ui/ReactionBar'
import { useSocialProof } from '../hooks/useSocialProof'

// Tracks the single currently-unmuted feed video so only one plays sound at a time.
let currentlyUnmutedVideo = null

/** Normalize feed items from either the edge fn (flat) or client fallback (nested). */
function getSeller(p) {
  if (p.seller) return p.seller
  return {
    id: p.seller_id,
    business_name: p.seller_name,
    full_name: p.seller_name,
    avatar_url: p.seller_avatar,
    is_verified: p.seller_verified,
    whatsapp: p.seller_whatsapp,
  }
}

/** Full-width social feed card. */
export default function FeedPostCard({ post, saved = false, following = false, cardIndex = 0, onSaveChange, onFollowChange }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const seller = getSeller(post)
  const articleRef = useRef(null)
  const { pillText } = useSocialProof(post.id)

  const [isSaved, setIsSaved] = useState(saved)
  const [isFollowing, setIsFollowing] = useState(following)
  const [buyOpen, setBuyOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState(post.comments_count ?? null)

  useEffect(() => setIsSaved(saved), [saved])
  useEffect(() => setIsFollowing(following), [following])

  useEffect(() => {
    if (comments == null) fetchCommentCount(post.id).then(setComments)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  // Impression log (drives the fair-reach rollup).
  useEffect(() => {
    logEvent('impression', { product_id: post.id, seller_id: post.seller_id })
  }, [post.id, post.seller_id])

  // Staggered fade+slide entrance, fired once when scrolled into view.
  useEffect(() => {
    const el = articleRef.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(16px)'
    el.style.transition = 'none'
    const io = new IntersectionObserver(
      ([entry], observer) => {
        if (!entry.isIntersecting) return
        // Stagger by index but cap it so deep infinite-scroll cards don't lag.
        const delay = Math.min(Number(el.dataset.cardIndex || 0) * 60, 400)
        setTimeout(() => {
          el.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out'
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
        }, delay)
        observer.unobserve(el)
      },
      { threshold: 0.05 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const requireAuth = () => {
    if (!user) {
      navigate('/auth', { state: { from: '/' } })
      return false
    }
    return true
  }

  const onSave = async () => {
    if (!requireAuth()) return
    const next = !isSaved
    setIsSaved(next) // optimistic
    onSaveChange?.(post.id, next)
    const res = await toggleSave(user.id, post.id, isSaved)
    if (res !== next) setIsSaved(res)
    if (next) logEvent('save', { product_id: post.id, seller_id: post.seller_id, category: post.category })
  }

  const onFollow = async () => {
    if (!requireAuth()) return
    const next = await toggleFollow(user.id, post.seller_id, isFollowing)
    setIsFollowing(next)
    onFollowChange?.(post.seller_id, next)
  }

  const onShare = async () => {
    const result = await shareProduct(post)
    if (result === 'copied') toast.success('Link copied to clipboard')
    else if (result === 'failed') toast.error('Could not share')
  }

  // Only treat as "own post" for a signed-in user with a matching seller id —
  // `undefined === undefined` must never hide the Follow button.
  const isOwn = Boolean(user?.id) && user.id === post.seller_id
  const isVideoPost = Boolean(post.video_url)

  return (
    <article ref={articleRef} data-card-index={cardIndex} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => navigate(`/seller/${post.seller_id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar src={seller.avatar_url} name={seller.business_name || seller.full_name} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{seller.business_name || seller.full_name || 'Seller'}</p>
              {seller.is_verified && <VerifiedSellerBadge />}
            </div>
            <p className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <PinIcon className="h-3.5 w-3.5" />
              {post.town || 'Nearby'}
              {post.distance_km != null && ` · ${formatDistance(post.distance_km * 1000)}`}
              <span>· {timeAgo(post.created_at)}</span>
            </p>
          </div>
        </button>
        {!isOwn && (
          <Button size="sm" variant={isFollowing ? 'outline' : 'primary'} onClick={onFollow}>
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {/* Media carousel */}
      <Carousel images={post.images} video={post.video_url} title={post.title} pillText={pillText} onOpen={() => navigate(`/product/${post.id}`)} />

      {/* Reaction bar */}
      <div className="px-3 pt-3">
        <ReactionBar productId={post.id} size="sm" />
      </div>

      {/* Details */}
      <div className="space-y-2 p-3 pt-2">
        <div className="flex items-center gap-2">
          <p className="text-xl font-extrabold font-display text-primary">{formatNaira(post.price)}</p>
          {post.is_available && (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">For sale</span>
          )}
        </div>
        <button onClick={() => navigate(`/product/${post.id}`)} className="block text-left">
          <h3 className="line-clamp-2 font-semibold">{post.title}</h3>
        </button>

        {/* Action row */}
        <div className="flex items-center gap-5 pt-1 text-[var(--color-text-muted)]">
          <button onClick={onSave} aria-label="Save" className="flex items-center gap-1 tactile-press">
            <BookmarkIcon filled={isSaved} />
          </button>
          <button onClick={() => setCommentsOpen(true)} aria-label="Comments" className="flex items-center gap-1 tactile-press">
            <CommentIcon />
            {comments > 0 && <span className="text-xs font-medium">{comments}</span>}
          </button>
          <button onClick={onShare} aria-label="Share" className="tactile-press">
            <ShareIcon />
          </button>
          <span className="ml-auto text-xs">👁 {post.views ?? 0}</span>
        </div>

        {/* Video posts are showcase-style: no Buy button, just a details CTA. */}
        {isVideoPost ? (
          <Button fullWidth variant="outline" className="mt-1" onClick={() => navigate(`/product/${post.id}`)}>
            View item ›
          </Button>
        ) : post.is_available ? (
          <Button fullWidth className="mt-1" onClick={() => setBuyOpen(true)} leftIcon={<WhatsAppIcon className="h-5 w-5" />}>
            Buy on WhatsApp
          </Button>
        ) : null}
      </div>

      <BuyWhatsAppModal open={buyOpen} onClose={() => setBuyOpen(false)} product={{ ...post, seller }} />
      <CommentsSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} product={post} onCountChange={setComments} />
    </article>
  )
}

function Carousel({ images = [], video, title, pillText, onOpen }) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef(null)
  const slides = [...(video ? [{ video }] : []), ...images.map((src) => ({ src }))]
  if (slides.length === 0) slides.push({ src: null })

  const onScroll = () => {
    const el = trackRef.current
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className="relative">
      <div ref={trackRef} onScroll={onScroll} className="no-scrollbar flex aspect-square w-full snap-x snap-mandatory overflow-x-auto bg-navy/5">
        {slides.map((s, i) => (
          <div key={i} className="aspect-square w-full shrink-0 snap-center" onClick={onOpen}>
            {s.video ? (
              <AutoplayVideo src={s.video} />
            ) : s.src ? (
              <img src={s.src} alt={title} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-navy/20">
                <img src="/logo/logo-icon.svg" alt="" className="h-12 w-12 opacity-40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Social-proof pill overlaid on the image */}
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

/**
 * Autoplays muted in view, pauses out of view. Tap to unmute; only one feed
 * video is unmuted at a time (coordinated via the module-level ref + event).
 * Shows a mute toggle and a thin progress bar.
 */
function AutoplayVideo({ src }) {
  const ref = useRef(null)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100)
    }
    const onMuteEvent = () => setMuted(true)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('sociamart:mute', onMuteEvent)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else {
          el.pause()
          if (currentlyUnmutedVideo === el) {
            currentlyUnmutedVideo = null
            el.muted = true
            setMuted(true)
          }
        }
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('sociamart:mute', onMuteEvent)
      if (currentlyUnmutedVideo === el) currentlyUnmutedVideo = null
    }
  }, [])

  const toggleMute = (e) => {
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    const next = !muted
    if (!next) {
      // Unmuting: mute any other currently-unmuted video first.
      if (currentlyUnmutedVideo && currentlyUnmutedVideo !== el) {
        currentlyUnmutedVideo.dispatchEvent(new Event('sociamart:mute'))
        currentlyUnmutedVideo.muted = true
      }
      currentlyUnmutedVideo = el
    } else if (currentlyUnmutedVideo === el) {
      currentlyUnmutedVideo = null
    }
    el.muted = next
    setMuted(next)
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video ref={ref} src={src} className="h-full w-full object-contain" muted loop playsInline preload="metadata" />
      <button
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-sm text-white backdrop-blur tactile-press"
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function BookmarkIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-6 w-6', filled ? 'text-primary' : '')} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}
function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.8-4.5A8 8 0 1 1 21 12Z" />
    </svg>
  )
}
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}
