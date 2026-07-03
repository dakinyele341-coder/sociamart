import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn'
import { timeAgo } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { markRead, notificationLink, notificationIcon } from '../lib/notifications'

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, markAllRead, refetch } = useNotifications()

  // Mark all as read shortly after viewing.
  useEffect(() => {
    if (isAuthenticated && unreadCount > 0) {
      const t = setTimeout(() => markAllRead(), 1200)
      return () => clearTimeout(t)
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = (n) => {
    if (!n.is_read) markRead(n.id).then(refetch)
    navigate(notificationLink(n))
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold font-display tracking-tight">Notifications</h1>
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
          <span className="text-4xl">🔔</span>
          <p className="font-semibold">Sign in to see notifications</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold font-display tracking-tight">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm font-semibold text-primary tactile-press">Mark all read</button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
          <span className="text-4xl">🔔</span>
          <p className="font-semibold">You're all caught up</p>
          <p className="max-w-[260px] text-sm text-[var(--color-text-muted)]">New followers, comments, and buyer requests will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-3 text-left tactile-press',
                n.is_read ? 'border-[var(--color-border)] bg-[var(--color-surface)]' : 'border-primary/30 bg-primary/5'
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/5 text-lg dark:bg-white/10">
                {notificationIcon(n.type)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{n.message}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
