import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { WhatsAppIcon } from '../components/icons'
import { formatNaira, timeAgo } from '../lib/format'
import { categoryLabel } from '../lib/categories'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { listIncomingRequests, respondToRequest } from '../lib/requests'

export default function SellerRequestsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!user) return
    listIncomingRequests(user.id).then((data) => {
      setRequests(data)
      setLoading(false)
    })
  }, [user])

  const respond = async (req) => {
    setBusyId(req.id)
    const { error } = await respondToRequest(req.id, user.id)
    setBusyId(null)
    if (error) {
      toast.error(error.message)
      return
    }
    setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'matched', seller_id: user.id } : r)))
    toast.success("Marked as seen — the buyer has been notified")
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display tracking-tight">Buyer requests</h1>
      <p className="text-sm text-[var(--color-text-muted)]">Requests sent to your store and open requests nearby.</p>

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
          <span className="text-3xl">📥</span>
          <p className="font-semibold">No requests yet</p>
          <p className="max-w-[240px] text-sm text-[var(--color-text-muted)]">When buyers request items, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const buyer = req.buyer || {}
            const claimed = req.status !== 'open'
            const wa = buildWhatsAppLink(
              buyer.whatsapp || buyer.phone,
              `Hi! About your SociaMart request "${req.title}" — I can help.`
            )
            return (
              <div key={req.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => navigate(`/seller/${buyer.id}`)}>
                    <Avatar src={buyer.avatar_url} name={buyer.business_name || buyer.full_name} size="sm" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{buyer.business_name || buyer.full_name || 'Buyer'}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{timeAgo(req.created_at)}</p>
                  </div>
                  <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-medium capitalize dark:bg-white/10">{req.status}</span>
                </div>

                <p className="mt-2 font-semibold">{req.title}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-[var(--color-text-muted)]">
                  {req.budget_max && <span className="text-primary">Up to {formatNaira(req.budget_max)}</span>}
                  {req.category && <span>{categoryLabel(req.category)}</span>}
                  {req.town && <span>📍 {req.town}</span>}
                </div>

                <div className="mt-3 flex gap-2">
                  {!claimed && (
                    <Button size="sm" loading={busyId === req.id} onClick={() => respond(req)}>I have this</Button>
                  )}
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => !claimed && respond(req)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success tactile-press"
                    >
                      <WhatsAppIcon className="h-5 w-5" /> Message buyer
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
