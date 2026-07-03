import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_EMAIL } from '../../lib/admin'
import { cn } from '../../lib/cn'

const SECTIONS = [
  { to: '/admin', label: 'Overview', icon: '📊', end: true },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/products', label: 'Products', icon: '📦' },
  { to: '/admin/reports', label: 'Reports', icon: '🚩' },
  { to: '/admin/feedback', label: 'Feedback', icon: '💬' },
  { to: '/admin/verifications', label: 'Verify', icon: '✓' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📈' },
]

/** Admin shell: sidebar on desktop, bottom tabs on mobile. */
export default function AdminLayout() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="grid min-h-[100dvh] place-items-center"><img src="/logo/logo-icon.svg" alt="" className="h-12 w-12 animate-pulse" /></div>
  }
  // Server-enforced via RLS too; this is the client gate.
  const isAdmin = profile?.role === 'admin' || user?.email === ADMIN_EMAIL
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] md:block">
        <div className="sticky top-0 p-4">
          <div className="mb-6 flex items-center gap-2">
            <img src="/logo/logo-icon.svg" alt="" className="h-8 w-8" />
            <span className="font-extrabold font-display">Admin</span>
          </div>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <SideLink key={s.to} {...s} />
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-3 backdrop-blur md:hidden">
        <img src="/logo/logo-icon.svg" alt="" className="h-7 w-7" />
        <span className="font-extrabold font-display">Admin</span>
        <BackToApp />
      </header>

      <main className="flex-1 px-4 py-5 pb-24 md:pb-8 md:px-8">
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur md:hidden safe-bottom">
        {SECTIONS.map((s) => (
          <BottomTab key={s.to} {...s} />
        ))}
      </nav>
    </div>
  )
}

function SideLink({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium tactile-press',
          isActive ? 'bg-primary/10 text-primary' : 'text-[var(--color-text-muted)] hover:bg-navy/5 dark:hover:bg-white/5')
      }
    >
      <span>{icon}</span> {label}
    </NavLink>
  )
}

function BottomTab({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
          isActive ? 'text-primary' : 'text-[var(--color-text-muted)]')
      }
    >
      <span className="text-base">{icon}</span>
      {label}
    </NavLink>
  )
}

function BackToApp() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/')} className="ml-auto text-sm font-semibold text-primary tactile-press">
      Exit
    </button>
  )
}
