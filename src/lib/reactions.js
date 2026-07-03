import { supabase, isSupabaseConfigured } from './supabase'

export const EMOJIS = ['fire', 'love', 'money', 'eyes']
export const EMOJI_CHAR = { fire: '🔥', love: '❤️', money: '💰', eyes: '👀' }

/** Aggregate reaction counts → { fire, love, money, eyes }. */
export async function fetchReactionCounts(productId) {
  const base = { fire: 0, love: 0, money: 0, eyes: 0 }
  if (!isSupabaseConfigured || !productId) return base
  const { data } = await supabase.rpc('get_reaction_counts', { product_uuid: productId })
  for (const row of data ?? []) {
    if (row.emoji in base) base[row.emoji] = Number(row.count)
  }
  return base
}

/** The signed-in user's reaction for a product, or null. */
export async function fetchMyReaction(productId) {
  if (!isSupabaseConfigured || !productId) return null
  const { data } = await supabase.rpc('get_my_reaction', { product_uuid: productId })
  return data ?? null
}

/** Add or switch a reaction (one row per user/product). */
export async function upsertReaction(userId, productId, emoji) {
  if (!isSupabaseConfigured) return { error: null }
  return supabase
    .from('reactions')
    .upsert({ user_id: userId, product_id: productId, emoji }, { onConflict: 'user_id,product_id' })
}

/** Remove the user's reaction for a product. */
export async function deleteReaction(userId, productId) {
  if (!isSupabaseConfigured) return { error: null }
  return supabase.from('reactions').delete().match({ user_id: userId, product_id: productId })
}
