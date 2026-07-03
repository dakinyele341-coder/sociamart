import { supabase, isSupabaseConfigured } from './supabase'

// A stable per-tab session id for grouping anonymous events.
function sessionId() {
  try {
    let id = sessionStorage.getItem('sociamart.session')
    if (!id) {
      id = crypto.randomUUID?.() || String(Date.now())
      sessionStorage.setItem('sociamart.session', id)
    }
    return id
  } catch {
    return null
  }
}

/**
 * Write an interaction event to the `analytics_events` table (insert is public).
 * No-ops in demo mode; never throws.
 */
export async function logEvent(eventName, properties = {}, userId = null) {
  if (!isSupabaseConfigured) return
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      properties,
      user_id: userId,
      session_id: sessionId(),
    })
  } catch {
    /* analytics must never break the UI */
  }
}
