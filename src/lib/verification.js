import { supabase, isSupabaseConfigured } from './supabase'
import { sanitizeText } from './validation'

/** The user's latest verification request (or null). */
export async function getMyVerification(userId) {
  if (!isSupabaseConfigured || !userId) return null
  const { data } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

/** Submit a verification application. */
export async function requestVerification(userId, form) {
  if (!isSupabaseConfigured) return { error: null }
  return supabase.from('verification_requests').insert({
    user_id: userId,
    business_name: sanitizeText(form.businessName, 120),
    business_type: form.businessType,
    state: sanitizeText(form.state, 60) || null,
    lga: sanitizeText(form.lga, 60) || null,
    whatsapp: sanitizeText(form.whatsapp, 20) || null,
    cac_number: sanitizeText(form.cacNumber, 40) || null,
  })
}
