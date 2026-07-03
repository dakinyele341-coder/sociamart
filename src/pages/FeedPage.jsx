import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import FeedPostCard from '../components/FeedPostCard'
import FeedTips from '../components/FeedTips'
import FilterSheet from '../components/ui/FilterSheet'
import Button from '../components/ui/Button'
import { ProductCardSkeleton } from '../components/ui/Skeleton'
import { cn } from '../lib/cn'
import { useFeed } from '../hooks/useFeed'
import { track } from '../lib/posthog'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../context/LocationContext'
import { listSavedIds } from '../lib/saves'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TABS = [
  { id: 'foryou', label: 'For You' },
  { id: 'following', label: 'Following' },
]

export default function FeedPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { location } = useLocation()
  const [tab, setTab] = useState('foryou')
  const [filterOpen, setFilterOpen] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [followingIds, setFollowingIds] = useState(new Set())

  // Filters live in the URL.
  const filters = useMemo(() => parseFilters(params), [params])
  const activeFilterCount = countActive(filters)

  const { posts, loading, loadingMore, hasMore, loadMore } = useFeed({ mode: tab, filters })

  // Load the viewer's saved + following sets once for card state.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSavedIds(new Set())
      setFollowingIds(new Set())
      return
    }
    listSavedIds(user.id).then(setSavedIds)
    if (isSupabaseConfigured) {
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .then(({ data }) => setFollowingIds(new Set((data ?? []).map((f) => f.following_id))))
    }
  }, [user, isAuthenticated])

  const onSaveChange = useCallback((productId, saved) => {
    setSavedIds((prev) => {
      const next = new Set(prev)
      saved ? next.add(productId) : next.delete(productId)
      return next
    })
  }, [])
  const onFollowChange = useCallback((sellerId, following) => {
    setFollowingIds((prev) => {
      const next = new Set(prev)
      following ? next.add(sellerId) : next.delete(sellerId)
      return next
    })
  }, [])

  // Infinite scroll sentinel.
  const sentinel = useRef(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: '600px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold font-display tracking-tight">
          Near {location?.town || 'you'}
        </h1>
        <Button size="sm" variant="outline" onClick={() => setFilterOpen(true)}>
          Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative -mb-px pb-2 text-sm font-semibold transition-colors',
              tab === t.id ? 'text-primary' : 'text-[var(--color-text-muted)]'
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {tab === 'foryou' && <FeedTips />}

      {tab === 'following' && !isAuthenticated ? (
        <SignInPrompt onClick={() => navigate('/auth', { state: { from: '/' } })} />
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed tab={tab} onSell={() => navigate('/sell/single')} />
      ) : (
        <div className="space-y-4">
          {posts.map((p, index) => (
            <FeedPostCard
              key={p.id}
              post={p}
              cardIndex={index}
              saved={savedIds.has(p.id)}
              following={followingIds.has(p.seller_id)}
              onSaveChange={onSaveChange}
              onFollowChange={onFollowChange}
            />
          ))}

          <div ref={sentinel} />
          {loadingMore && <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Loading more…</p>}
          {!hasMore && <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">You're all caught up 🎉</p>}
        </div>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={(f) => {
          const used = [
            f.categories?.length && 'category',
            f.maxDistanceKm && 'distance',
            f.availableOnly && 'available',
            (f.priceMin > 0 || f.priceMax < 1_000_000) && 'price',
            f.sort && f.sort !== 'newest' && 'sort',
          ].filter(Boolean)
          track('filter_applied', { filter_types_used: used })
          setParams(serializeFilters(f))
        }}
      />
    </div>
  )
}

function EmptyFeed({ tab, onSell }) {
  return (
    <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
      <img src="/logo/logo-icon.svg" alt="" className="h-12 w-12 opacity-50" />
      <p className="font-semibold">{tab === 'following' ? 'No posts from sellers you follow' : 'No products near you yet'}</p>
      <p className="max-w-[250px] text-sm text-[var(--color-text-muted)]">
        {tab === 'following' ? 'Follow sellers to see their latest listings here.' : 'Be the first to sell in your area!'}
      </p>
      {tab !== 'following' && <Button className="mt-1" onClick={onSell}>Start Selling</Button>}
    </div>
  )
}

function SignInPrompt({ onClick }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
      <p className="font-semibold">See sellers you follow</p>
      <p className="max-w-[240px] text-sm text-[var(--color-text-muted)]">Sign in to follow sellers and build your feed.</p>
      <Button onClick={onClick}>Sign in</Button>
    </div>
  )
}

// --- URL <-> filters ---------------------------------------------------------
function parseFilters(params) {
  const categories = params.get('cat') ? params.get('cat').split(',').filter(Boolean) : []
  return {
    categories,
    priceMin: params.get('min') ? Number(params.get('min')) : 0,
    priceMax: params.get('max') ? Number(params.get('max')) : 1_000_000,
    maxDistanceKm: params.get('dist') ? Number(params.get('dist')) : null,
    availableOnly: params.get('avail') === '1',
    sort: params.get('sort') || 'newest',
  }
}
function serializeFilters(f) {
  const p = {}
  if (f.categories?.length) p.cat = f.categories.join(',')
  if (f.priceMin) p.min = String(f.priceMin)
  if (f.priceMax && f.priceMax < 1_000_000) p.max = String(f.priceMax)
  if (f.maxDistanceKm) p.dist = String(f.maxDistanceKm)
  if (f.availableOnly) p.avail = '1'
  if (f.sort && f.sort !== 'newest') p.sort = f.sort
  return p
}
function countActive(f) {
  let n = 0
  if (f.categories?.length) n += f.categories.length
  if (f.maxDistanceKm) n += 1
  if (f.availableOnly) n += 1
  if (f.priceMin > 0 || (f.priceMax && f.priceMax < 1_000_000)) n += 1
  if (f.sort && f.sort !== 'newest') n += 1
  return n
}
