import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { identify, resetAnalytics } from '../lib/posthog'

const AuthContext = createContext(null)

export const TERMS_VERSION = '1.0'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId || !isSupabaseConfigured) {
      setProfile(null)
      return null
    }
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    setProfile(data ?? null)
    if (data) identify(data.id, { role: data.role, location_name: data.town || null })
    return data ?? null
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) loadProfile(data.session.user.id)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) loadProfile(newSession.user.id)
      else setProfile(null)
    })

    return () => {
      active = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [loadProfile])

  const callbackUrl = () => `${window.location.origin}/auth/callback`

  // --- Sign in: Google OAuth (primary) -------------------------------------
  const signInWithGoogle = useCallback(async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    })
  }, [])

  // --- Sign in: email magic link (fallback) --------------------------------
  const requestEmailOtp = useCallback(async (email) => {
    return supabase.auth.signInWithOtp({
      email: String(email).trim(),
      options: { shouldCreateUser: true, emailRedirectTo: callbackUrl() },
    })
  }, [])

  // Record terms acceptance on first sign-in (only if not already accepted).
  const acceptTerms = useCallback(async (userId, version = TERMS_VERSION) => {
    if (!userId || !isSupabaseConfigured) return
    const { data } = await supabase
      .from('users')
      .update({ terms_accepted_at: new Date().toISOString(), terms_version: version })
      .eq('id', userId)
      .is('terms_accepted_at', null)
      .select()
      .maybeSingle()
    if (data) setProfile(data)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    resetAnalytics()
    setProfile(null)
  }, [])

  const updateProfile = useCallback(
    async (patch) => {
      if (!session?.user) return { error: new Error('Not signed in') }
      const { data, error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', session.user.id)
        .select()
        .single()
      if (!error && data) setProfile(data)
      return { data, error }
    },
    [session?.user]
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAuthenticated: Boolean(session?.user),
      isAdmin: profile?.role === 'admin',
      onboardingComplete: Boolean(profile?.onboarding_completed),
      onboardingStep: profile?.onboarding_step ?? 0,
      // Auth
      signInWithGoogle,
      requestEmailOtp,
      acceptTerms,
      signOut,
      updateProfile,
      // Pass a userId to avoid a race right after the callback exchange,
      // before `session` state has settled.
      refreshProfile: (userId) => loadProfile(userId ?? session?.user?.id),
    }),
    [session, profile, loading, signInWithGoogle, requestEmailOtp, acceptTerms, signOut, updateProfile, loadProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
