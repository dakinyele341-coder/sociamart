import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import { cn } from '../lib/cn'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { REPORT_REASONS, submitReport } from '../lib/reports'

/** Report a product or seller. Pass `productId` and/or `userId`. */
export default function ReportSheet({ open, onClose, productId = null, userId = null, label = 'this' }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [reason, setReason] = useState('scam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!user) {
      onClose()
      navigate('/auth', { state: { from: '/' } })
      return
    }
    setBusy(true)
    const result = await submitReport({ reportedUserId: userId, reportedProductId: productId, reason, details })
    setBusy(false)
    if (result === 'duplicate') {
      toast.info("You've already reported this recently.")
    } else if (result === 'error') {
      toast.error('Could not submit report')
    } else {
      toast.success('Thank you. Our team will review this.')
    }
    setDetails('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Report ${label}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReason(r.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium tactile-press',
                reason === r.id ? 'border-primary bg-primary/5 text-primary' : 'border-[var(--color-border)]'
              )}
            >
              {r.label}
              <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', reason === r.id ? 'border-primary bg-primary text-white' : 'border-[var(--color-border)]')}>
                {reason === r.id && '✓'}
              </span>
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          placeholder="Add details (optional) — helps our team."
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button fullWidth variant="danger" loading={busy} onClick={submit}>Submit Report</Button>
      </div>
    </Sheet>
  )
}
