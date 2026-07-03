import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card, { CardBody } from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { VerifiedSellerBadge, NewSellerBadge } from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import { useSellerAnalytics } from '../hooks/useSellerAnalytics'
import FeedbackModal from '../components/FeedbackModal'

const SELLER_ROLES = ['seller', 'both', 'admin']

export default function AccountPage() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <SignedIn /> : <SignedOut />
}

function SignedIn() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const name = profile?.full_name || user?.email?.split('@')[0] || 'You'
  const isSeller = SELLER_ROLES.includes(profile?.role)
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display tracking-tight">Account</h1>

      <Card interactive={false}>
        <CardBody className="flex items-center gap-4">
          <Avatar src={profile?.avatar_url} name={name} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold font-display">{name}</p>
            <p className="truncate text-sm text-[var(--color-text-muted)]">{user?.email}</p>
            <div className="mt-1.5">
              {profile?.is_verified ? <VerifiedSellerBadge /> : <NewSellerBadge />}
            </div>
          </div>
        </CardBody>
      </Card>

      {isSeller && <SellerStats sellerId={user?.id} />}

      <div className="space-y-2">
        {isAdmin && <Row label="🛡️ Admin panel" onClick={() => navigate('/admin')} />}
        <Row label="👤 View my profile" onClick={() => navigate('/profile')} />
        {isSeller && <Row label="🏪 My Store" onClick={() => navigate('/store')} />}
        {isSeller && <Row label="📥 Buyer requests" onClick={() => navigate('/requests')} />}
        {isSeller && !profile?.is_verified && <Row label="✓ Get verified" onClick={() => navigate('/verify')} />}
        <Row label="🔔 Notifications" onClick={() => navigate('/notifications')} />
        <Row label="🔖 Saved items" onClick={() => navigate('/saved')} />
        <Row label="🚫 Blocked accounts" onClick={() => navigate('/settings/blocked')} />
        <Row label="Send feedback" onClick={() => setFeedbackOpen(true)} />
      </div>

      <LegalSection navigate={navigate} />

      <Button variant="outline" fullWidth onClick={signOut}>Sign out</Button>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}

/** Seller dashboard: simple counter cards from get_seller_analytics. */
function SellerStats({ sellerId }) {
  const { stats, loading } = useSellerAnalytics(sellerId)
  const s = stats || {}
  return (
    <div>
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Seller stats
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total views" value={loading ? '—' : s.total_views ?? 0} />
        <Stat label="Views (7d)" value={loading ? '—' : s.views_7d ?? 0} />
        <Stat label="WhatsApp taps" value={loading ? '—' : s.whatsapp_taps ?? 0} />
        <Stat label="Followers" value={loading ? '—' : s.followers ?? 0} />
        <Stat label="New followers (7d)" value={loading ? '—' : `+${s.followers_7d ?? 0}`} />
        <Stat label="Requests" value={loading ? '—' : s.requests ?? 0} />
      </div>
      {s.top_product && (
        <p className="mt-2 rounded-xl bg-primary/8 px-3 py-2 text-sm">
          🏆 Top product: <span className="font-semibold">{s.top_product.title}</span> · {s.top_product.views} views
        </p>
      )}
    </div>
  )
}

/** "Legal" section linking to the static Terms and Privacy pages. */
function LegalSection({ navigate }) {
  return (
    <div>
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Legal
      </p>
      <div className="space-y-2">
        <Row label="Terms of Service" onClick={() => navigate('/terms')} />
        <Row label="Privacy Policy" onClick={() => navigate('/privacy')} />
      </div>
    </div>
  )
}

function SignedOut() {
  const navigate = useNavigate()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display tracking-tight">Account</h1>
      <Card interactive={false}>
        <CardBody className="space-y-3 text-center">
          <img src="/logo/logo-light.svg" alt="SociaMart" className="mx-auto h-10 dark:hidden" />
          <img src="/logo/logo-dark.svg" alt="SociaMart" className="mx-auto hidden h-10 dark:block" />
          <p className="text-sm text-[var(--color-text-muted)]">
            Sign in to buy, sell, follow sellers, and chat on WhatsApp.
          </p>
          <Button fullWidth onClick={() => navigate('/auth', { state: { from: '/account' } })}>
            Sign in / Create account
          </Button>
        </CardBody>
      </Card>

      <LegalSection navigate={navigate} />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <Card interactive={false} className="text-center">
      <CardBody className="px-2 py-3">
        <p className="text-xl font-extrabold font-display text-primary">{value}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      </CardBody>
    </Card>
  )
}

function Row({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-sm font-medium tactile-press"
    >
      {label}
      <span className="text-[var(--color-text-muted)]">›</span>
    </button>
  )
}
