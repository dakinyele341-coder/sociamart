import { useState, useEffect, useCallback } from 'react'
import Pill from '../../components/ui/Pill'
import { timeAgo } from '../../lib/format'
import { listFeedback, setFeedbackStatus } from '../../lib/admin'

const TYPES = [
  { id: 'bug', label: '🐛 Bug' },
  { id: 'suggestion', label: '💡 Suggestion' },
  { id: 'complaint', label: '😤 Complaint' },
  { id: 'praise', label: '🙌 Compliment' },
]
const STATUSES = ['new', 'reviewing', 'resolved', 'dismissed']

export default function AdminFeedback() {
  const [type, setType] = useState(null)
  const [status, setStatus] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await listFeedback({ type, status }))
    setLoading(false)
  }, [type, status])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, s) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: s } : r)))
    await setFeedbackStatus(id, s)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display">Feedback</h1>

      <div className="flex flex-wrap gap-2">
        <Pill active={!type} onClick={() => setType(null)}>All types</Pill>
        {TYPES.map((t) => <Pill key={t.id} active={type === t.id} onClick={() => setType(t.id)}>{t.label}</Pill>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill active={!status} onClick={() => setStatus(null)}>Any status</Pill>
        {STATUSES.map((s) => <Pill key={s} active={status === s} onClick={() => setStatus(s)} className="capitalize">{s}</Pill>)}
      </div>

      {loading ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">No feedback.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((f) => (
            <div key={f.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <button onClick={() => setOpenId(openId === f.id ? null : f.id)} className="flex w-full items-center justify-between text-left">
                <span className="flex items-center gap-2 text-sm font-semibold capitalize">
                  {TYPES.find((t) => t.id === f.type)?.label || f.type}
                  {f.status === 'new' && <span className="h-2 w-2 rounded-full bg-error" />}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">{timeAgo(f.created_at)}</span>
              </button>
              <p className={openId === f.id ? 'mt-2 text-sm' : 'mt-2 line-clamp-2 text-sm'}>{f.message}</p>
              {f.contact_email && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{f.contact_email}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => updateStatus(f.id, s)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize tactile-press ${f.status === s ? 'border-primary bg-primary/5 text-primary' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
