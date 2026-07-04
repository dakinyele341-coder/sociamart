import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileHeader from '../components/profile/ProfileHeader'
import SellerProductsGrid from '../components/profile/SellerProductsGrid'
import ProductCard from '../components/ProductCard'
import Button from '../components/ui/Button'
import FeedbackModal from '../components/FeedbackModal'
import { ProductCardSkeleton } from '../components/ui/Skeleton'
import { cn } from '../lib/cn'
import { formatNaira, timeAgo } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useSellerProducts } from '../hooks/useProducts'
import { followerCount, followingCount } from '../lib/social'
import { listSavedProducts } from '../lib/saves'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const SELLER_ROLES = ['seller', 'both', 'admin']

export default function MyProfilePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isSeller = SELLER_ROLES.includes(profile?.role)

  const [stats, setStats] = useState({ products: 0, followers: 0, following: 0 })
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [tab, setTab] = useState(isSeller ? 'products' : 'saved')

  useEffect(() => {
    if (!user) return
    Promise.all([followerCount(user.id), followingCount(user.id)]).then(([f, fg]) =>
      setStats((s) => ({ ...s, followers: f, following: fg }))
    )
  }, [user])

  // Stable identity + bail-out when unchanged, otherwise the child effect that
  // reports the product count re-fires every render and loops forever.
  const handleProductCount = useCallback((n) => {
    setStats((s) => (s.products === n ? s : { ...s, products: n }))
  }, [])

  const tabs = [
    isSeller && { id: 'products', label: 'My Products' },
    { id: 'saved', label: 'Saved' },
    { id: 'requests', label: 'Requests' },
    { id: 'reviews', label: 'Reviews' },
  ].filter(Boolean)

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)] pb-16">
      <button
        onClick={() => navigate('/account')}
        aria-label="Back"
        className="fixed left-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur tactile-press"
      >
        <span className="text-xl leading-none">‹</span>
      </button>

      <ProfileHeader
        profile={profile}
        userId={user?.id}
        stats={stats}
        isOwn
        onEdit={() => navigate('/profile/edit')}
      />

      <div className="px-4 pt-4">
        <div className="flex items-center justify-end gap-3 text-sm">
          <button onClick={() => navigate('/account')} className="font-semibold text-[var(--color-text-muted)] tactile-press">Settings</button>
          <span className="text-[var(--color-border)]">·</span>
          <button onClick={() => setFeedbackOpen(true)} className="font-semibold text-primary tactile-press">Send Feedback</button>
        </div>

        {/* Tabs */}
        <div className="no-scrollbar mt-3 flex gap-5 overflow-x-auto border-b border-[var(--color-border)]">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn('relative -mb-px shrink-0 pb-2 text-sm font-semibold transition-colors',
                tab === t.id ? 'text-primary' : 'text-[var(--color-text-muted)]')}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'products' && <MyProducts userId={user?.id} profile={profile} onCountChange={handleProductCount} onManage={() => navigate('/store')} />}
          {tab === 'saved' && <SavedTab userId={user?.id} />}
          {tab === 'requests' && <RequestsTab userId={user?.id} />}
          {tab === 'reviews' && <MyReviewsTab userId={user?.id} />}
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}

function MyProducts({ userId, profile, onCountChange, onManage }) {
  const { products, loading } = useSellerProducts(userId, { includeDrafts: true })
  useEffect(() => {
    if (!loading) onCountChange?.(products.filter((p) => p.status !== 'draft').length)
  }, [loading, products, onCountChange])
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onManage}>Manage in Store</Button>
      </div>
      <SellerProductsGrid products={products} loading={loading} seller={profile} />
    </div>
  )
}

function SavedTab({ userId }) {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    listSavedProducts(userId).then((d) => { setProducts(d); setLoading(false) })
  }, [userId])
  if (loading) return <Grid><ProductCardSkeleton /><ProductCardSkeleton /></Grid>
  if (products.length === 0) return <Empty text="No saved items yet." />
  return (
    <Grid>
      {products.map((p) => <ProductCard key={p.id} product={p} onOpen={() => navigate(`/product/${p.id}`)} />)}
    </Grid>
  )
}

function RequestsTab({ userId }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) { setLoading(false); return }
    supabase.from('product_requests').select('*').eq('buyer_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => { setRequests(data ?? []); setLoading(false) })
  }, [userId])
  if (loading) return <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
  if (requests.length === 0) return <Empty text="You haven't sent any requests." />
  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div key={r.id} className="rounded-xl border border-[var(--color-border)] p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{r.title}</p>
            <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-medium capitalize dark:bg-white/10">{r.status}</span>
          </div>
          {r.budget_max && <p className="text-sm text-primary">Up to {formatNaira(r.budget_max)}</p>}
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{timeAgo(r.created_at)}</p>
        </div>
      ))}
    </div>
  )
}

function MyReviewsTab({ userId }) {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) { setLoading(false); return }
    supabase.from('reviews').select('*, seller:seller_id(id, business_name, full_name)').eq('reviewer_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => { setReviews(data ?? []); setLoading(false) })
  }, [userId])
  if (loading) return <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
  if (reviews.length === 0) return <Empty text="You haven't written any reviews." />
  return (
    <div className="space-y-2">
      {reviews.map((r) => (
        <button key={r.id} onClick={() => navigate(`/seller/${r.seller?.id}`)} className="block w-full rounded-xl border border-[var(--color-border)] p-3 text-left tactile-press">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{r.seller?.business_name || r.seller?.full_name || 'Seller'}</p>
            <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
          </div>
          {r.comment && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{r.comment}</p>}
          <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{timeAgo(r.created_at)}</p>
        </button>
      ))}
    </div>
  )
}

function Grid({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}
function Empty({ text }) {
  return <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">{text}</p>
}
