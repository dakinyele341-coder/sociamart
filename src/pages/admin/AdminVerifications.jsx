import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Pill from '../../components/ui/Pill'
import Avatar from '../../components/ui/Avatar'
import { useToast } from '../../context/ToastContext'
import { timeAgo } from '../../lib/format'
import { listVerifications, decideVerification } from '../../lib/admin'

const STATUSES = ['pending', 'approved', 'denied']

export default function AdminVerifications() {
  const navigate = useNavigate()
  const toast = useToast()
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await listVerifications({ status }))
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  const decide = async (req, decision) => {
    const { error } = await decideVerification(req.id, decision)
    if (error) { toast.error(error.message); return }
    setRows((rs) => rs.filter((r) => r.id !== req.id))
    toast.success(decision === 'approved' ? 'Approved — seller verified' : 'Request denied')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display">Verification requests</h1>
      <div className="flex gap-2">
        {STATUSES.map((s) => <Pill key={s} active={status === s} onClick={() => setStatus(s)} className="capitalize">{s}</Pill>)}
      </div>

      {loading ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <button onClick={() => navigate(`/seller/${r.user?.id}`)} className="flex items-center gap-2.5">
                <Avatar src={r.user?.avatar_url} name={r.business_name} size="sm" />
                <span className="font-semibold">{r.business_name}</span>
              </button>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <Row label="Type" value={r.business_type} />
                <Row label="State" value={r.state || '—'} />
                <Row label="LGA" value={r.lga || '—'} />
                <Row label="WhatsApp" value={r.whatsapp || '—'} />
                <Row label="CAC" value={r.cac_number || '—'} />
                <Row label="Date" value={timeAgo(r.created_at)} />
              </dl>
              {status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => decide(r, 'approved')} className="flex-1 rounded-lg bg-success/10 py-2 text-sm font-semibold text-success tactile-press">Approve</button>
                  <button onClick={() => decide(r, 'denied')} className="flex-1 rounded-lg bg-error/10 py-2 text-sm font-semibold text-error tactile-press">Deny</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="truncate font-medium capitalize">{value}</dd>
    </div>
  )
}
