import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { track } from '../../lib/posthog'
import Confetti from '../../components/ui/Confetti'
import Button from '../../components/ui/Button'
import StepName from './steps/StepName'
import StepLocation from './steps/StepLocation'
import StepRole from './steps/StepRole'
import StepBusiness from './steps/StepBusiness'
import StepFirstProduct from './steps/StepFirstProduct'

// Step indices
const NAME = 0, LOCATION = 1, ROLE = 2, BUSINESS = 3, PRODUCT = 4

export default function OnboardingFlow() {
  const { profile, updateProfile, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Seed the wizard from any existing profile progress (resume support).
  const [form, setForm] = useState(() => ({ ...(profile || {}) }))
  const [index, setIndex] = useState(() => Math.min(profile?.onboarding_step ?? 0, PRODUCT))
  const [saving, setSaving] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    // If the profile loads after first render, seed once.
    if (profile && !form.id) {
      setForm({ ...profile })
      setIndex(Math.min(profile.onboarding_step ?? 0, PRODUCT))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const isSeller = useMemo(() => form.role === 'seller' || form.role === 'both', [form.role])
  const totalSteps = isSeller ? 5 : 3
  const progress = Math.min((index + 1) / totalSteps, 1)

  // Persist a patch and the next step index, then advance the wizard.
  const save = async (patch, nextIndex) => {
    setForm((f) => ({ ...f, ...patch }))
    setSaving(true)
    const { error } = await updateProfile({ ...patch, onboarding_step: nextIndex })
    setSaving(false)
    if (error) toast.error(error.message)
    return !error
  }

  const finish = async (patch = {}) => {
    setSaving(true)
    const sellerFinish = isSeller || patch.role === 'seller' || patch.role === 'both'
    await updateProfile({
      ...patch,
      onboarding_completed: true,
      onboarding_step: sellerFinish ? PRODUCT + 1 : ROLE + 1,
      is_new_seller: sellerFinish,
    })
    await refreshProfile?.()
    setSaving(false)
    track('onboarding_completed', { role: patch.role || form.role, steps_taken: sellerFinish ? 5 : 3 })

    if (sellerFinish) {
      setCelebrate(true)
      setTimeout(() => navigate('/account', { replace: true }), 2400)
    } else {
      toast.success('Welcome to SociaMart! 🎉')
      navigate('/', { replace: true })
    }
  }

  const handleName = (patch) => save(patch, LOCATION).then((ok) => ok && setIndex(LOCATION))
  const handleLocation = (patch) => save(patch, ROLE).then((ok) => ok && setIndex(ROLE))

  const handleRole = async (patch) => {
    // Buyers finish here; sellers continue to business details.
    if (patch.role === 'buyer') {
      await finish(patch)
    } else {
      const ok = await save(patch, BUSINESS)
      if (ok) setIndex(BUSINESS)
    }
  }

  const handleBusiness = (patch) => save(patch, PRODUCT).then((ok) => ok && setIndex(PRODUCT))
  const finishSeller = () => finish({})

  const back = () => setIndex((i) => Math.max(0, i - 1))

  if (celebrate) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-6 text-center">
        <Confetti />
        <div className="animate-toast-in">
          <span className="text-6xl">🎉</span>
          <h1 className="mt-4 text-3xl font-extrabold font-display">Your store is live!</h1>
          <p className="mt-2 text-[var(--color-text-muted)]">Taking you to your storefront…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-6">
      {/* Progress bar */}
      <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-navy/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-tactile"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Slide container — keyed so each step animates in */}
      <div key={index} className="animate-slide-in">
        {index === NAME && <StepName data={form} onNext={handleName} saving={saving} />}
        {index === LOCATION && <StepLocation data={form} onNext={handleLocation} onBack={back} saving={saving} />}
        {index === ROLE && <StepRole data={form} onNext={handleRole} onBack={back} saving={saving} />}
        {index === BUSINESS && <StepBusiness data={form} onNext={handleBusiness} onBack={back} saving={saving} />}
        {index === PRODUCT && (
          <StepFirstProduct data={form} onDone={finishSeller} onSkip={finishSeller} onBack={back} />
        )}
      </div>

      {/* Escape hatch for buyers who reach later via resume */}
      {index <= ROLE && (
        <button
          onClick={() => navigate('/')}
          className="mt-auto pt-8 text-center text-xs text-[var(--color-text-muted)] tactile-press"
        >
          I'll do this later
        </button>
      )}
    </div>
  )
}
