import { supabase, isSupabaseConfigured } from './supabase'
import { track } from './posthog'

/** Returns a Set of product ids the user has saved. */
export async function listSavedIds(userId) {
  if (!isSupabaseConfigured || !userId) return new Set()
  const { data } = await supabase.from('saved_items').select('product_id').eq('user_id', userId)
  return new Set((data ?? []).map((r) => r.product_id))
}

/** Full saved products (joined) for the Saved Items page. */
export async function listSavedProducts(userId) {
  if (!isSupabaseConfigured || !userId) return []
  const { data } = await supabase
    .from('saved_items')
    .select('created_at, product:product_id(*, seller:seller_id(id, full_name, business_name, avatar_url, is_verified, rating, whatsapp, phone))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r) => r.product).filter(Boolean)
}

/** Toggle a save. Returns the new saved state. */
export async function toggleSave(userId, productId, currentlySaved) {
  if (!isSupabaseConfigured || !userId) return !currentlySaved
  if (currentlySaved) {
    await supabase.from('saved_items').delete().eq('user_id', userId).eq('product_id', productId)
    return false
  }
  await supabase.from('saved_items').insert({ user_id: userId, product_id: productId })
  track('product_saved', { product_id: productId })
  return true
}
