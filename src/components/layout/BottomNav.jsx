import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { HomeIcon, ExploreIcon, SellIcon, AccountIcon, BellIcon } from '../icons'
import Sheet from '../ui/Sheet'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'

const LEFT = [
  { to: '/', label: 'Feed', Icon: HomeIcon, end: true },
  { to: '/explore', label: 'Explore', Icon: ExploreIcon },
]
const RIGHT = [
  { to: '/notifications', label: 'Alerts', Icon: BellIcon },
  { to: '/account', label: 'Profile', Icon: AccountIcon },
]

const SELLER_ROLES = ['seller', 'both', 'admin']

/** Persistent, thumb-friendly bottom navigation. Sellers get a center "+" action. */
export default function BottomNav() {
  const { profile } = useAuth()
  const { unreadCount } = useNotifications()
  const [sheetOpen, setSheetOpen] = useState(false)
  const navigate = useNavigate()
  const isSeller = SELLER_ROLES.includes(profile?.role)

  const left = LEFT
  const right = RIGHT

  const go = (path) => {
    setSheetOpen(false)
    navigate(path)
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md safe-bottom" aria-label="Primary">
        <div className="mx-3 mb-3 flex items-center justify-around rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-2 py-1.5 shadow-nav backdrop-blur">
          {left.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          {isSeller && (
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Add product"
              className="flex flex-none flex-col items-center px-2"
            >
              <span className="grid h-12 w-12 -translate-y-3 place-items-center rounded-2xl bg-primary text-white shadow-lift tactile-press">
                <SellIcon className="h-6 w-6" />
              </span>
            </button>
          )}

          {right.map((item) => (
            <NavItem key={item.to} {...item} badge={item.to === '/notifications' ? unreadCount : 0} />
          ))}
        </div>
      </nav>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add to your store">
        <div className="space-y-3">
          <SheetOption emoji="📸" title="Add Single Product" subtitle="Photos, details, location — one item" onClick={() => go('/sell/single')} />
          <SheetOption emoji="🗂️" title="Import from Gallery" subtitle="Turn up to 20 photos into listings fast" onClick={() => go('/sell/bulk')} />
        </div>
      </Sheet>
    </>
  )
}

function NavItem({ to, label, Icon, end, badge = 0 }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 tactile-press transition-colors',
          isActive ? 'text-primary' : 'text-[var(--color-text-muted)]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon className={cn('h-6 w-6 transition-transform', isActive && '-translate-y-0.5')} />
            {badge > 0 && (
              <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-[var(--color-surface)]">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium">{label}</span>
          {isActive && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
        </>
      )}
    </NavLink>
  )
}

function SheetOption({ emoji, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="tactile-card flex w-full items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-2xl">{emoji}</span>
      <span className="min-w-0">
        <span className="block font-bold font-display">{title}</span>
        <span className="block text-sm text-[var(--color-text-muted)]">{subtitle}</span>
      </span>
      <span className="ml-auto text-[var(--color-text-muted)]">›</span>
    </button>
  )
}
