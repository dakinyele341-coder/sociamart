import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Requests a seller can act on: those addressed to them, plus open broadcasts
 * not yet claimed by anyone.
 */
export async function listIncomingRequests(sellerId) {
  if (!isSupabaseConfigured || !sellerId) return []
  const { data } = await supabase
    .from('product_requests')
    .select('*, buyer:buyer_id(id, full_name, business_name, avatar_url, whatsapp, phone)')
    .or(`seller_id.eq.${sellerId},and(status.eq.open,seller_id.is.null)`)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Claim/respond to a request: marks it matched and notifies the buyer ("seen"). */
export async function respondToRequest(requestId, sellerId) {
  if (!isSupabaseConfigured) return { error: null }
  return supabase
    .from('product_requests')
    .update({ seller_id: sellerId, status: 'matched' })
    .eq('id', requestId)
}
