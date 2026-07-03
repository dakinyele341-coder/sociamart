import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import FeedPage from './pages/FeedPage'
import ExplorePage from './pages/ExplorePage'
import SellPage from './pages/SellPage'
import AccountPage from './pages/AccountPage'
import NotFoundPage from './pages/NotFoundPage'
import AuthPage from './pages/auth/AuthPage'
import AuthCallback from './pages/auth/AuthCallback'
import OnboardingFlow from './pages/onboarding/OnboardingFlow'
import StoreManagementPage from './pages/store/StoreManagementPage'
import ProductDetailPage from './pages/ProductDetailPage'
import SellerProfilePage from './pages/SellerProfilePage'
import MyProfilePage from './pages/MyProfilePage'
import EditProfilePage from './pages/EditProfilePage'
import FollowListPage from './pages/FollowListPage'
import NotificationsPage from './pages/NotificationsPage'
import SavedItemsPage from './pages/SavedItemsPage'
import SellerRequestsPage from './pages/SellerRequestsPage'
import BlockedAccountsPage from './pages/BlockedAccountsPage'
import VerificationPage from './pages/VerificationPage'
import { useAuth } from './context/AuthContext'
import { track } from './lib/posthog'

// Code-split heavy / rarely-hit routes into their own chunks.
const TermsPage = lazy(() => import('./pages/legal/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'))
const SingleProductFlow = lazy(() => import('./pages/sell/SingleProductFlow'))
const BulkImportFlow = lazy(() => import('./pages/sell/BulkImportFlow'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'))
const AdminVerifications = lazy(() => import('./pages/admin/AdminVerifications'))
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'))

export default function App() {
  const location = useLocation()

  // Manual pageview tracking on route change.
  useEffect(() => {
    track('$pageview', { path: location.pathname })
  }, [location.pathname])

  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Public legal pages (accessible without auth) */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Public product & seller pages (own full-screen chrome) */}
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/seller/:id" element={<SellerProfilePage />} />
      <Route path="/seller/:id/followers" element={<FollowListPage mode="followers" />} />
      <Route path="/seller/:id/following" element={<FollowListPage mode="following" />} />

      {/* Own profile (guarded, full-screen) */}
      <Route path="/profile" element={<RequireAuth><MyProfilePage /></RequireAuth>} />
      <Route path="/profile/edit" element={<RequireAuth><EditProfilePage /></RequireAuth>} />
      <Route path="/verify" element={<RequireAuth><VerificationPage /></RequireAuth>} />
      <Route path="/settings/blocked" element={<RequireAuth><BlockedAccountsPage /></RequireAuth>} />

      {/* Full-screen flows (no app chrome) */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      {/* Legacy/alias: /feed renders the feed at the app root */}
      <Route path="/feed" element={<Navigate to="/" replace />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingGate>
              <OnboardingFlow />
            </OnboardingGate>
          </RequireAuth>
        }
      />

      {/* Admin panel (guarded inside AdminLayout — non-admins redirected to /) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="feedback" element={<AdminFeedback />} />
        <Route path="verifications" element={<AdminVerifications />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>

      {/* Seller posting wizards (guarded, full-screen) */}
      <Route path="/sell/single" element={<RequireAuth><SellShell><SingleProductFlow /></SellShell></RequireAuth>} />
      <Route path="/sell/bulk" element={<RequireAuth><SellShell><BulkImportFlow /></SellShell></RequireAuth>} />

      {/* Main app shell */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<FeedPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/store" element={<RequireAuth><StoreManagementPage /></RequireAuth>} />
        <Route path="/requests" element={<RequireAuth><SellerRequestsPage /></RequireAuth>} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/saved" element={<SavedItemsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

/** Lightweight fallback while a lazy route chunk loads. */
function RouteFallback() {
  return (
    <div className="grid min-h-[100dvh] place-items-center">
      <img src="/logo/logo-icon.svg" alt="Loading" className="h-12 w-12 animate-pulse" />
    </div>
  )
}

/** Padded full-screen container for the seller posting wizards. */
function SellShell({ children }) {
  return <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)] px-4 py-5">{children}</div>
}

/** Redirect to /auth when not signed in, preserving where they came from. */
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenSpinner />
  if (!isAuthenticated) return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  return children
}

/** If onboarding is already complete, skip the wizard. */
function OnboardingGate({ children }) {
  const { onboardingComplete, loading, profile } = useAuth()
  if (loading || (profile == null)) return <FullScreenSpinner />
  if (onboardingComplete) return <Navigate to="/" replace />
  return children
}

function FullScreenSpinner() {
  const navigate = useNavigate()
  // Avoid an infinite blank if profile never loads.
  useEffect(() => {
    const t = setTimeout(() => navigate('/'), 6000)
    return () => clearTimeout(t)
  }, [navigate])
  return (
    <div className="grid min-h-[100dvh] place-items-center">
      <img src="/logo/logo-icon.svg" alt="Loading" className="h-12 w-12 animate-pulse" />
    </div>
  )
}
