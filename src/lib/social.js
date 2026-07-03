import { supabase, isSupabaseConfigured } from './supabase'
import { track } from './posthog'

/** Is `followerId` following `followingId`? */
export async function isFollowing(followerId, followingId) {
  if (!isSupabaseConfigured || !followerId || !followingId) return false
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  return Boolean(data)
}

/** Toggle a follow relationship. Returns the new following state. */
export async function toggleFollow(followerId, followingId, currentlyFollowing) {
  if (!isSupabaseConfigured) return !currentlyFollowing
  if (currentlyFollowing) {
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
    return false
  }
  await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
  track('seller_followed', { seller_id: followingId })
  return true
}

/** Count followers of a seller. */
export async function followerCount(sellerId) {
  if (!isSupabaseConfigured || !sellerId) return 0
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', sellerId)
  return count ?? 0
}

/** Count how many sellers a user follows. */
export async function followingCount(userId) {
  if (!isSupabaseConfigured || !userId) return 0
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)
  return count ?? 0
}

const USER_FIELDS = 'id, full_name, business_name, avatar_url, is_verified, role, town, state'

/** Users who follow `sellerId`. */
export async function listFollowers(sellerId) {
  if (!isSupabaseConfigured || !sellerId) return []
  const { data } = await supabase
    .from('follows')
    .select(`created_at, user:follower_id(${USER_FIELDS})`)
    .eq('following_id', sellerId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r) => r.user).filter(Boolean)
}

/** Sellers `userId` follows. */
export async function listFollowing(userId) {
  if (!isSupabaseConfigured || !userId) return []
  const { data } = await supabase
    .from('follows')
    .select(`created_at, user:following_id(${USER_FIELDS})`)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r) => r.user).filter(Boolean)
}
