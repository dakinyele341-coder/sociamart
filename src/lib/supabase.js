import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * A single shared Supabase client for the whole app.
 *
 * When env vars are missing (e.g. first-run before configuration) we export a
 * harmless stub so the UI still renders instead of crashing on import. Check
 * `isSupabaseConfigured` before relying on real network calls.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[SociaMart] Supabase env vars are missing. Copy .env.example to .env and fill them in.'
  )
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // PKCE + a dedicated /auth/callback page handle the code exchange for
        // both Google OAuth and email magic links. We exchange the code manually
        // there, so disable auto-detection on every page load.
        flowType: 'pkce',
        detectSessionInUrl: false,
      },
    })
  : createStub()

function createStub() {
  const error = new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  const resolved = () => Promise.resolve({ data: null, error })
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    neq: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: resolved,
    maybeSingle: resolved,
    then: (resolve) => resolve({ data: null, error }),
  }
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOtp: resolved,
      signInWithPassword: resolved,
      signInWithOAuth: resolved,
      exchangeCodeForSession: resolved,
      signUp: resolved,
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => builder,
    storage: { from: () => ({ upload: resolved, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    rpc: resolved,
  }
}
