import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../../components/ui/Input'
import Pill from '../../components/ui/Pill'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { CATEGORIES, categoryLabel } from '../../lib/categories'
import { formatNaira, timeAgo } from '../../lib/format'
import { listAdminProducts, removeProduct } from '../../lib/admin'

export default function AdminProducts() {
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingRemove, setPendingRemove] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await listAdminProducts({ search, category }))
    setLoading(false)
  }, [search, category])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const confirmRemove = async () => {
    const p = pendingRemove
    setPendingRemove(null)
    const { error } = await removeProduct(p.id)
    if (error) toast.error(error.message)
    else {
      toast.success('Product removed')
      setRows((rs) => rs.filter((r) => r.id !== p.id))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display">Products</h1>
      <Input placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Pill active={!category} onClick={() => setCategory(null)}>All</Pill>
        {CATEGORIES.map((c) => <Pill key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.emoji}</Pill>)}
      </div>

      {loading ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-navy/5">
                {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {formatNaira(p.price)} · {categoryLabel(p.category)} · {p.seller?.business_name || p.seller?.full_name || '—'}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">👁 {p.views ?? 0} · {p.status} · {timeAgo(p.created_at)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => navigate(`/product/${p.id}`)} className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold tactile-press">View</button>
                <button onClick={() => setPendingRemove(p)} className="rounded-lg border border-error/30 px-2.5 py-1 text-xs font-semibold text-error tactile-press">Remove</button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="py-8 text-sm text-[var(--color-text-muted)]">No products found.</p>}
        </div>
      )}

      <Modal
        open={Boolean(pendingRemove)}
        onClose={() => setPendingRemove(null)}
        title="Remove product?"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setPendingRemove(null)}>Cancel</Button>
            <Button variant="danger" fullWidth onClick={confirmRemove}>Remove</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text-muted)]">Permanently remove “{pendingRemove?.title}” for a policy violation?</p>
      </Modal>
    </div>
  )
}
