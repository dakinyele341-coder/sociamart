import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Pill from '../../components/ui/Pill'
import { useToast } from '../../context/ToastContext'
import { timeAgo } from '../../lib/format'
import { REPORT_REASONS } from '../../lib/reports'
import { listReports, setReportStatus, listFlaggedSellers, warnUser, setUserSuspended, removeProduct } from '../../lib/admin'

const STATUSES = ['pending', 'reviewed', 'action_taken', 'dismissed']

export default function AdminReports() {
  const navigate = useNavigate()
  const toast = useToast()
  const [status, setStatus] = useState('pending')
  const [reason, setReason] = useState(null)
  const [rows, setRows] = useState([])
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [r, f] = await Promise.all([listReports({ status, reason }), listFlaggedSellers()])
    setRows(r)
    setFlagged(f)
    setLoading(false)
  }, [status, reason])

  useEffect(() => { load() }, [load])

  const update = async (id, s) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: s } : r)))
    await setReportStatus(id, s)
  }
  const onWarn = async (r) => {
    if (!r.reported_user?.id) return
    await warnUser(r.reported_user.id)
    await update(r.id, 'action_taken')
    toast.success('Warning sent')
  }
  const onSuspend = async (r) => {
    if (!r.reported_user?.id) return
    await setUserSuspended(r.reported_user.id, true)
    await update(r.id, 'action_taken')
    toast.success('User suspended')
  }
  const onRemoveProduct = async (r) => {
    if (!r.product?.id) return
    await removeProduct(r.product.id)
    await update(r.id, 'action_taken')
    toast.success('Product removed')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display">Reports</h1>

      {flagged.length > 0 && (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-3">
          <p className="text-sm font-bold text-error">⚠️ Priority — sellers with 3+ reports / 7 days</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {flagged.map((f) => (
              <button key={f.seller_id} onClick={() => navigate(`/seller/${f.seller_id}`)} className="rounded-full bg-error/10 px-2.5 py-1 text-xs font-semibold text-error tactile-press">
                {f.report_count} reports
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => <Pill key={s} active={status === s} onClick={() => setStatus(s)} className="capitalize">{s.replace('_', ' ')}</Pill>)}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Pill active={!reason} onClick={() => setReason(null)}>Any reason</Pill>
        {REPORT_REASONS.map((r) => <Pill key={r.id} active={reason === r.id} onClick={() => setReason(r.id)}>{r.label}</Pill>)}
      </div>

      {loading ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">No reports here. 🎉</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-bold uppercase text-error">{r.reason.replace('_', ' ')}</span>
                <span className="text-[11px] text-[var(--color-text-muted)]">{timeAgo(r.created_at)}</span>
              </div>
              <p className="mt-1.5 text-sm">
                <span className="font-semibold">{r.reporter?.business_name || r.reporter?.full_name || 'Someone'}</span> reported{' '}
                {r.product ? (
                  <button onClick={() => navigate(`/product/${r.product.id}`)} className="font-semibold text-primary underline">{r.product.title}</button>
                ) : r.reported_user ? (
                  <button onClick={() => navigate(`/seller/${r.reported_user.id}`)} className="font-semibold text-primary underline">{r.reported_user.business_name || r.reported_user.full_name}</button>
                ) : 'an entity'}
              </p>
              {r.details && <p className="mt-1 text-sm text-[var(--color-text-muted)]">“{r.details}”</p>}

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Mini onClick={() => update(r.id, 'dismissed')}>Dismiss</Mini>
                {r.reported_user?.id && <Mini danger onClick={() => onWarn(r)}>Warn</Mini>}
                {r.reported_user?.id && <Mini danger onClick={() => onSuspend(r)}>Suspend</Mini>}
                {r.product?.id && <Mini danger onClick={() => onRemoveProduct(r)}>Remove product</Mini>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Mini({ children, onClick, danger }) {
  return (
    <button onClick={onClick} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold tactile-press ${danger ? 'border-error/30 text-error' : 'border-[var(--color-border)]'}`}>{children}</button>
  )
}
