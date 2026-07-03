import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../../components/ui/Input'
import Pill from '../../components/ui/Pill'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { listUsers, setUserVerified, setUserSuspended, toCsv } from '../../lib/admin'

const ROLES = ['buyer', 'seller', 'both', 'admin']

export default function AdminUsers() {
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await listUsers({ search, role }))
    setLoading(false)
  }, [search, role])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const toggleVerified = async (u) => {
    setRows((rs) => rs.map((r) => (r.id === u.id ? { ...r, is_verified: !r.is_verified } : r)))
    await setUserVerified(u.id, !u.is_verified)
  }
  const toggleSuspended = async (u) => {
    setRows((rs) => rs.map((r) => (r.id === u.id ? { ...r, is_suspended: !r.is_suspended } : r)))
    await setUserSuspended(u.id, !u.is_suspended)
    toast.info(!u.is_suspended ? 'User suspended' : 'User reinstated')
  }

  const exportCsv = () => {
    const csv = toCsv(rows, ['id', 'full_name', 'business_name', 'role', 'town', 'state', 'is_verified', 'is_suspended', 'created_at'])
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'sociamart-users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold font-display">Users</h1>
        <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>

      <Input placeholder="Search name / store / username…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Pill active={!role} onClick={() => setRole(null)}>All</Pill>
        {ROLES.map((r) => <Pill key={r} active={role === r} onClick={() => setRole(r)} className="capitalize">{r}</Pill>)}
      </div>

      {loading ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => (
            <div key={u.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="flex items-center gap-3">
                <Avatar src={u.avatar_url} name={u.business_name || u.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{u.business_name || u.full_name || 'User'}</p>
                    {u.is_verified && <span className="text-verified">✓</span>}
                    {u.is_suspended && <span className="rounded bg-error/10 px-1.5 text-[10px] font-bold text-error">SUSPENDED</span>}
                  </div>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    <span className="capitalize">{u.role}</span>{u.town ? ` · ${u.town}` : ''}{u.whatsapp ? ` · ${u.whatsapp}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Mini onClick={() => navigate(`/seller/${u.id}`)}>View</Mini>
                <Mini onClick={() => toggleVerified(u)}>{u.is_verified ? 'Unverify' : 'Verify'}</Mini>
                <Mini danger onClick={() => toggleSuspended(u)}>{u.is_suspended ? 'Reinstate' : 'Suspend'}</Mini>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="py-8 text-sm text-[var(--color-text-muted)]">No users found.</p>}
        </div>
      )}
    </div>
  )
}

function Mini({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold tactile-press ${danger ? 'border-error/30 text-error' : 'border-[var(--color-border)]'}`}
    >
      {children}
    </button>
  )
}
