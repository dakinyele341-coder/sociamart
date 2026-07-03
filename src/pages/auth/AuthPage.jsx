import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { isValidEmail } from '../../lib/validation'
import { track } from '../../lib/posthog'

const RESEND_SECONDS = 60
const DRAFT_KEY = 'sociamart.authDraft'

export default function AuthPage() {
  const { signInWithGoogle, requestEmailOtp } = useAuth()
  const toast = useToast()

  const [email, setEmail] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}').email || ''
    } catch {
      return ''
    }
  })
  const [stage, setStage] = useState('entry') // 'entry' | 'sent'
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Persist email so visiting /terms or /privacy and returning keeps it.
  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ email }))
  }, [email])

  const handleGoogle = async () => {
    setGoogleLoading(true)
    track('auth_google_click')
    const { error: err } = await signInWithGoogle()
    if (err) {
      setGoogleLoading(false)
      toast.error(err.message)
    }
    // On success the browser redirects to Google, so no further UI needed.
  }

  const sendLink = async (e) => {
    e?.preventDefault()
    if (!isValidEmail(email)) {
      setError('Enter a valid email address')
      return
    }
    setError('')
    setSending(true)
    track('auth_magiclink_request')
    const { error: err } = await requestEmailOtp(email)
    setSending(false)
    if (err) {
      toast.error(err.message)
      return
    }
    setStage('sent')
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-16">
      {/* Brand */}
      <div className="mb-10 text-center">
        <img src="/logo/logo-icon.svg" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-3xl font-extrabold font-display tracking-tight">
          Socia<span className="text-primary">Mart</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Discover. Connect. Buy.</p>
      </div>

      {stage === 'entry' ? (
        <EntryStage
          email={email}
          setEmail={setEmail}
          error={error}
          googleLoading={googleLoading}
          sending={sending}
          onGoogle={handleGoogle}
          onSendLink={sendLink}
        />
      ) : (
        <SentStage email={email} onResend={sendLink} onBack={() => setStage('entry')} />
      )}

      <div className="mt-auto pt-8" />
    </div>
  )
}

function EntryStage({ email, setEmail, error, googleLoading, sending, onGoogle, onSendLink }) {
  return (
    <div className="space-y-5">
      {/* Primary: Google */}
      <button
        onClick={onGoogle}
        disabled={googleLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[15px] font-semibold text-[var(--color-text)] tactile-press disabled:opacity-70"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs font-medium text-[var(--color-text-muted)]">or</span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      {/* Fallback: email magic link */}
      <form onSubmit={onSendLink} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          autoFocus
        />
        <Button type="submit" fullWidth size="lg" variant="secondary" loading={sending}>
          Send me a login link
        </Button>
      </form>

      <LegalNote />
    </div>
  )
}

function SentStage({ email, onResend, onBack }) {
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const timer = useRef(null)

  const startCountdown = () => {
    clearInterval(timer.current)
    setSeconds(RESEND_SECONDS)
    timer.current = setInterval(() => {
      setSeconds((s) => (s <= 1 ? (clearInterval(timer.current), 0) : s - 1))
    }, 1000)
  }

  useEffect(() => {
    startCountdown()
    return () => clearInterval(timer.current)
  }, [])

  const resend = () => {
    if (seconds > 0) return
    onResend()
    startCountdown()
  }

  return (
    <div className="space-y-6 text-center">
      <EnvelopeIcon />
      <div>
        <h2 className="text-xl font-bold font-display">Check your inbox!</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          We sent a login link to <span className="font-semibold text-[var(--color-text)]">{email}</span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Open it on this device to finish signing in.</p>
      </div>

      <div className="text-sm">
        {seconds > 0 ? (
          <span className="text-[var(--color-text-muted)]">
            Resend link in <span className="font-semibold tabular-nums text-[var(--color-text)]">{seconds}s</span>
          </span>
        ) : (
          <button onClick={resend} className="font-semibold text-primary tactile-press">Resend link</button>
        )}
      </div>

      <button onClick={onBack} className="text-sm font-medium text-[var(--color-text-muted)] tactile-press">
        ‹ Use a different email
      </button>

      <LegalNote />
    </div>
  )
}

function LegalNote() {
  return (
    <p className="text-center text-xs text-[var(--color-text-muted)]">
      By continuing you agree to SociaMart's{' '}
      <Link to="/terms" className="font-medium text-primary underline">Terms</Link> and{' '}
      <Link to="/privacy" className="font-medium text-primary underline">Privacy Policy</Link>.
    </p>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-primary/10">
      <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
        <rect x="6" y="11" width="36" height="26" rx="4" className="fill-[var(--color-surface)] stroke-primary" strokeWidth="2" />
        <path d="M8 14l16 12L40 14" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="stroke-dasharray" from="0 60" to="60 0" dur="0.8s" fill="freeze" />
        </path>
        <circle cx="38" cy="13" r="5" className="fill-primary">
          <animate attributeName="r" values="5;6;5" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}
