import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'
import { VerifiedSellerBadge } from '../components/ui/Badge'
import { ProfileSkeleton } from '../components/ui/Skeleton'
import { listFollowers, listFollowing } from '../lib/social'

/** Shared page for a seller's followers or following list. `mode` set by route. */
export default function FollowListPage({ mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetcher = mode === 'followers' ? listFollowers : listFollowing
    fetcher(id).then((data) => {
      setUsers(data)
      setLoading(false)
    })
  }, [id, mode])

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy/5 dark:hover:bg-white/10 tactile-press">
          <span className="text-xl leading-none">‹</span>
        </button>
        <h1 className="font-bold font-display capitalize">{mode}</h1>
      </header>

      <div className="p-4">
        {loading ? (
          <><ProfileSkeleton /><ProfileSkeleton /></>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--color-text-muted)]">
            {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => navigate(`/seller/${u.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left tactile-press"
              >
                <Avatar src={u.avatar_url} name={u.business_name || u.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold">{u.business_name || u.full_name || 'User'}</p>
                    {u.is_verified && <VerifiedSellerBadge />}
                  </div>
                  {(u.town || u.state) && <p className="truncate text-xs text-[var(--color-text-muted)]">{u.town || u.state}</p>}
                </div>
                <span className="text-[var(--color-text-muted)]">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
