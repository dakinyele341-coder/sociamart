import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ProfileHeader from '../components/profile/ProfileHeader'
import ReviewsSection from '../components/profile/ReviewsSection'
import SellerProductsGrid from '../components/profile/SellerProductsGrid'
import RequestItemSheet from '../components/RequestItemSheet'
import ReviewModal from '../components/ReviewModal'
import ReportSheet from '../components/ReportSheet'
import KebabMenu from '../components/ui/KebabMenu'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { useSellerProducts } from '../hooks/useProducts'
import { isFollowing, toggleFollow, followerCount, followingCount } from '../lib/social'
import { useBlocks } from '../context/BlockContext'
import { useToast } from '../context/ToastContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLocation as useGeo, geocodePlace } from '../context/LocationContext'

function haversineKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export default function SellerProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { location } = useGeo()
  const { products, loading } = useSellerProducts(id)

  const [seller, setSeller] = useState(null)
  const [following, setFollowing] = useState(false)
  const [stats, setStats] = useState({ products: 0, followers: 0, following: 0 })
  const [responseRate, setResponseRate] = useState(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [blockConfirm, setBlockConfirm] = useState(false)
  const { isBlocked, block } = useBlocks()
  const toast = useToast()

  const isOwn = user?.id === id

  useEffect(() => {
    let active = true
    if (isSupabaseConfigured && id) {
      supabase.from('users').select('*').eq('id', id).maybeSingle().then(({ data }) => active && setSeller(data))
      Promise.all([followerCount(id), followingCount(id)]).then(([f, fg]) => active && setStats((s) => ({ ...s, followers: f, following: fg })))
      supabase.rpc('get_seller_response_rate', { seller_uuid: id }).then(({ data }) => active && setResponseRate(data))
    } else {
      setSeller({ business_name: 'Demo Store', is_verified: true, rating: 4.8, rating_count: 12, created_at: new Date().toISOString(), bio: 'Quality goods, fast delivery.' })
    }
    if (user && id) isFollowing(user.id, id).then((f) => active && setFollowing(f))
    return () => { active = false }
  }, [id, user])

  useEffect(() => {
    setStats((s) => ({ ...s, products: products.length }))
  }, [products.length])

  const distanceKm = useMemo(() => {
    if (!location || !seller?.town) return null
    const place = geocodePlace(seller.town)
    return place ? haversineKm({ lat: location.lat, lon: location.lon }, { lat: place.lat, lon: place.lon }) : null
  }, [location, seller])

  const onFollow = async () => {
    if (!user) return navigate('/auth', { state: { from: `/seller/${id}` } })
    const next = await toggleFollow(user.id, id, following)
    setFollowing(next)
    setStats((s) => ({ ...s, followers: s.followers + (next ? 1 : -1) }))
  }

  const memberSince = seller?.created_at
    ? new Date(seller.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)] pb-12">
      {/* Floating back */}
      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        aria-label="Back"
        className="fixed left-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur tactile-press"
      >
        <span className="text-xl leading-none">‹</span>
      </button>
      {!isOwn && (
        <div className="fixed right-4 top-4 z-30">
          <KebabMenu
            onDark
            items={[
              { label: 'Report seller', danger: true, onClick: () => setReportOpen(true) },
              { label: 'Block this seller', danger: true, onClick: () => setBlockConfirm(true) },
            ]}
          />
        </div>
      )}

      <ProfileHeader
        profile={seller}
        userId={id}
        distanceKm={distanceKm}
        stats={stats}
        isOwn={isOwn}
        following={following}
        onFollow={onFollow}
        onRequest={() => setRequestOpen(true)}
        onEdit={() => navigate('/profile/edit')}
      />

      <div className="space-y-6 px-4 pt-6">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold font-display">🛍️ Shop</h2>
            {products.length > 0 && (
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {products.length} product{products.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <SellerProductsGrid products={products} loading={loading} seller={seller} />
        </section>

        {/* About */}
        <section className="space-y-2 rounded-2xl border border-[var(--color-border)] p-4">
          <h2 className="font-bold font-display">About</h2>
          <Row label="Member since" value={memberSince || '—'} />
          <Row label="Reviews" value={`★ ${Number(seller?.rating || 0).toFixed(1)} · ${seller?.rating_count || 0}`} />
          <Row label="Response rate" value={responseRate != null ? `${Math.round(responseRate * 100)}%` : '—'} />
        </section>

        <ReviewsSection
          sellerId={id}
          rating={Number(seller?.rating || 0)}
          ratingCount={seller?.rating_count || 0}
          canWrite={!isOwn}
          onWrite={() => (user ? setReviewOpen(true) : navigate('/auth', { state: { from: `/seller/${id}` } }))}
        />
      </div>

      <RequestItemSheet open={requestOpen} onClose={() => setRequestOpen(false)} sellerId={id} />
      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} sellerId={id} />
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} userId={id} label="this seller" />

      <Modal
        open={blockConfirm}
        onClose={() => setBlockConfirm(false)}
        title={`Block ${seller?.business_name || seller?.full_name || 'this seller'}?`}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setBlockConfirm(false)}>Cancel</Button>
            <Button
              variant="danger"
              fullWidth
              onClick={async () => {
                if (!user) return navigate('/auth', { state: { from: `/seller/${id}` } })
                await block(id)
                setBlockConfirm(false)
                toast.success('Seller blocked')
                navigate('/')
              }}
            >
              Block
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          You won't see their products or be able to message them. You can unblock from Settings → Blocked Accounts.
        </p>
      </Modal>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
