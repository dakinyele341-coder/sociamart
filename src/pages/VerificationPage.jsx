import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Pill from '../components/ui/Pill'
import { VerifiedSellerBadge } from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getMyVerification, requestVerification } from '../lib/verification'
import { isValidNgPhone } from '../lib/validation'

export default function VerificationPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    businessName: profile?.business_name || '',
    businessType: 'individual',
    state: profile?.state || '',
    lga: '',
    whatsapp: profile?.whatsapp || '',
    cacNumber: '',
  })
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (user) getMyVerification(user.id).then((d) => { setExisting(d); setLoading(false) })
  }, [user])

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.businessName.trim()) errs.businessName = 'Required'
    if (!isValidNgPhone(form.whatsapp)) errs.whatsapp = 'Enter a valid Nigerian number'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSubmitting(true)
    const { error } = await requestVerification(user.id, form)
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Verification request submitted — we\'ll review it soon.')
    navigate(-1)
  }

  if (profile?.is_verified) {
    return (
      <Shell navigate={navigate}>
        <div className="grid place-items-center gap-3 py-16 text-center">
          <VerifiedSellerBadge />
          <p className="font-semibold">Your store is verified</p>
          <p className="max-w-[240px] text-sm text-[var(--color-text-muted)]">The blue checkmark appears on your profile and posts.</p>
        </div>
      </Shell>
    )
  }

  if (!loading && existing?.status === 'pending') {
    return (
      <Shell navigate={navigate}>
        <div className="grid place-items-center gap-3 py-16 text-center">
          <span className="text-3xl">⏳</span>
          <p className="font-semibold">Request under review</p>
          <p className="max-w-[260px] text-sm text-[var(--color-text-muted)]">We've received your application and will notify you with a decision.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell navigate={navigate}>
      <p className="text-sm text-[var(--color-text-muted)]">
        Get a blue verified badge to build buyer trust. Tell us about your business.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <Input label="Business name" value={form.businessName} onChange={set('businessName')} error={errors.businessName} required />
        <div>
          <label className="mb-1.5 block text-sm font-medium">Business type</label>
          <div className="flex gap-2">
            <Pill active={form.businessType === 'individual'} onClick={() => setForm((f) => ({ ...f, businessType: 'individual' }))} className="flex-1 justify-center">Individual</Pill>
            <Pill active={form.businessType === 'registered'} onClick={() => setForm((f) => ({ ...f, businessType: 'registered' }))} className="flex-1 justify-center">Registered Business</Pill>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="State" value={form.state} onChange={set('state')} />
          <Input label="LGA" value={form.lga} onChange={set('lga')} />
        </div>
        <Input label="WhatsApp number" prefix="+234" value={form.whatsapp} onChange={set('whatsapp')} error={errors.whatsapp} required />
        {form.businessType === 'registered' && (
          <Input label="CAC number" value={form.cacNumber} onChange={set('cacNumber')} hint="Corporate Affairs Commission registration" />
        )}
        <Button type="submit" fullWidth size="lg" loading={submitting}>Submit for verification</Button>
      </form>
    </Shell>
  )
}

function Shell({ navigate, children }) {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full hover:bg-navy/5 dark:hover:bg-white/10 tactile-press">
          <span className="text-xl leading-none">‹</span>
        </button>
        <h1 className="font-bold font-display">Get verified</h1>
      </header>
      <div className="p-4">{children}</div>
    </div>
  )
}
