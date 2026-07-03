import { supabase, isSupabaseConfigured } from './supabase'

/** Most recent notifications for a user. */
export async function listNotifications(userId, limit = 50) {
  if (!isSupabaseConfigured || !userId) return []
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

/** Count of unread notifications. */
export async function unreadCount(userId) {
  if (!isSupabaseConfigured || !userId) return 0
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

/** Mark every notification read for a user. */
export async function markAllRead(userId) {
  if (!isSupabaseConfigured || !userId) return
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}

/** Mark a single notification read. */
export async function markRead(id) {
  if (!isSupabaseConfigured || !id) return
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

/** Destination route for a notification based on its type/metadata. */
export function notificationLink(n) {
  const m = n.metadata || {}
  switch (n.type) {
    case 'new_follower':
    case 'request_seen':
      return m.actor_id ? `/seller/${m.actor_id}` : '/notifications'
    case 'review_received':
      return m.product_id ? `/product/${m.product_id}` : (m.actor_id ? `/seller/${m.actor_id}` : '/notifications')
    case 'request_received':
      return '/requests'
    default:
      return '/notifications'
  }
}

export function notificationIcon(type) {
  switch (type) {
    case 'new_follower': return '➕'
    case 'review_received': return '⭐'
    case 'request_received': return '🛒'
    case 'request_seen': return '👀'
    default: return '🔔'
  }
}
