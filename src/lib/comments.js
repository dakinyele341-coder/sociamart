import { supabase, isSupabaseConfigured } from './supabase'

/** List public comments for a product (newest last for chat-style reading). */
export async function listComments(productId) {
  if (!isSupabaseConfigured || !productId) return []
  const { data } = await supabase
    .from('comments')
    .select('*, user:user_id(full_name, business_name, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })
  return data ?? []
}

/** Add a comment; returns { data, error } with the joined row. */
export async function addComment(productId, userId, content) {
  if (!isSupabaseConfigured) {
    return { data: { id: `demo-${Date.now()}`, content, created_at: new Date().toISOString(), user: { full_name: 'You' } }, error: null }
  }
  return supabase
    .from('comments')
    .insert({ product_id: productId, user_id: userId, content: content.trim() })
    .select('*, user:user_id(full_name, business_name, avatar_url)')
    .single()
}

/** Count comments for a product. */
export async function commentCount(productId) {
  if (!isSupabaseConfigured || !productId) return 0
  const { count } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)
  return count ?? 0
}
