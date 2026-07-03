import { supabase, isSupabaseConfigured } from './supabase'

/** Build a PostGIS POINT literal (or null) from a location object. */
export function pointFromLocation(loc) {
  if (!loc || loc.lat == null || loc.lon == null) return null
  return `POINT(${loc.lon} ${loc.lat})`
}

/** Create a product row. `payload` should already include seller_id. */
export async function createProduct(payload) {
  if (!isSupabaseConfigured) return { data: { id: `demo-${Date.now()}`, ...payload }, error: null }
  return supabase.from('products').insert(payload).select().single()
}

export async function updateProduct(id, patch) {
  if (!isSupabaseConfigured) return { data: { id, ...patch }, error: null }
  return supabase.from('products').update(patch).eq('id', id).select().single()
}

export async function deleteProduct(id) {
  if (!isSupabaseConfigured) return { error: null }
  return supabase.from('products').delete().eq('id', id)
}

/** Fire-and-forget view increment via the SECURITY DEFINER RPC. */
export async function incrementViews(id) {
  if (!isSupabaseConfigured || !id) return
  try {
    await supabase.rpc('increment_product_views', { product_uuid: id })
  } catch {
    /* ignore */
  }
}
