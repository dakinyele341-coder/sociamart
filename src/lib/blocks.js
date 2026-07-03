import { supabase, isSupabaseConfigured } from './supabase'

/** Set of user ids the current user has blocked. */
export async function listBlockedIds(userId) {
  if (!isSupabaseConfigured || !userId) return new Set()
  const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId)
  return new Set((data ?? []).map((b) => b.blocked_id))
}

/** Full blocked-user profiles for the settings list. */
export async function listBlockedUsers(userId) {
  if (!isSupabaseConfigured || !userId) return []
  const { data } = await supabase
    .from('blocks')
    .select('created_at, user:blocked_id(id, full_name, business_name, avatar_url)')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((b) => b.user).filter(Boolean)
}

export async function blockUser(blockerId, blockedId) {
  if (!isSupabaseConfigured) return { error: null }
  return supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId })
}

export async function unblockUser(blockerId, blockedId) {
  if (!isSupabaseConfigured) return { error: null }
  return supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId)
}
