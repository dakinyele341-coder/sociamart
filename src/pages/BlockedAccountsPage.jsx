import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useBlocks } from '../context/BlockContext'
import { listBlockedUsers } from '../lib/blocks'

export default function BlockedAccountsPage() {
  const { user } = useAuth()
  const { unblock } = useBlocks()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!user) return
    listBlockedUsers(user.id).then((d) => { setUsers(d); setLoading(false) })
  }
  useEffect(load, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const onUnblock = async (id) => {
    await unblock(id)
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy/5 dark:hover:bg-white/10 tactile-press">
          <span className="text-xl leading-none">‹</span>
        </button>
        <h1 className="font-bold font-display">Blocked Accounts</h1>
      </header>

      <div className="p-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : users.length === 0 ? (
          <div className="grid place-items-center gap-2 py-16 text-center">
            <span className="text-3xl">🚫</span>
            <p className="font-semibold">No blocked accounts</p>
            <p className="max-w-[240px] text-sm text-[var(--color-text-muted)]">Sellers you block won't appear in your feed, search, or requests.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <Avatar src={u.avatar_url} name={u.business_name || u.full_name} size="md" />
                <span className="min-w-0 flex-1 truncate font-semibold">{u.business_name || u.full_name || 'User'}</span>
                <Button size="sm" variant="outline" onClick={() => onUnblock(u.id)}>Unblock</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
