import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { track } from '../../lib/posthog'
import Button from '../../components/ui/Button'

/**
 * Handles the OAuth / magic-link redirect: exchanges the PKCE code for a
 * session, records terms acceptance, then routes by onboarding status.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const { acceptTerms, refreshProfile } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function run() {
      if (!isSupabaseConfigured) {
        navigate('/onboarding', { replace: true })
        return
      }

      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const providerError = url.searchParams.get('error_description')
      if (providerError) {
        if (active) setError(providerError)
        return
      }

      try {
        let session = null
        if (code) {
          const { data, error: exErr } = await supabase.auth.exchangeCodeForSession(code)
          if (exErr) throw exErr
          session = data.session
        } else {
          const { data } = await supabase.auth.getSession()
          session = data.session
        }
        if (!session?.user) throw new Error('Could not complete sign-in. Please try again.')

        const userId = session.user.id
        // First-time accounts: stamp terms acceptance now.
        await acceptTerms(userId)
        // Load the freshly-created/updated profile (pass id to dodge the state race).
        const profile = await refreshProfile(userId)

        if (!active) return
        if (!profile?.onboarding_completed) track('user_signed_up', { role: profile?.role })
        navigate(profile?.onboarding_completed ? '/' : '/onboarding', { replace: true })
      } catch (e) {
        if (active) setError(e?.message || 'Sign-in failed')
      }
    }

    run()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="mx-auto grid min-h-[100dvh] max-w-md place-items-center px-6 text-center">
        <div className="space-y-3">
          <span className="text-4xl">😕</span>
          <h1 className="text-xl font-bold font-display">Sign-in didn't complete</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
          <Button onClick={() => navigate('/auth', { replace: true })}>Back to sign in</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid min-h-[100dvh] max-w-md place-items-center px-6 text-center">
      <div className="space-y-3">
        <img src="/logo/logo-icon.svg" alt="" className="mx-auto h-12 w-12 animate-pulse" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Signing you in…</p>
      </div>
    </div>
  )
}
