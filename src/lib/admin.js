import { supabase, isSupabaseConfigured } from './supabase'

export const ADMIN_EMAIL = 'dakinyele341@gmail.com'

export async function getOverview() {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.rpc('get_admin_overview')
  return data ?? null
}

// --- Users -------------------------------------------------------------------
export async function listUsers({ search = '', role = null, verified = null } = {}) {
  if (!isSupabaseConfigured) return []
  let q = supabase
    .from('users')
    .select('id, full_name, business_name, username, avatar_url, role, is_verified, is_suspended, town, state, phone, whatsapp, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (role) q = q.eq('role', role)
  if (verified != null) q = q.eq('is_verified', verified)
  if (search) q = q.or(`full_name.ilike.%${search}%,business_name.ilike.%${search}%,username.ilike.%${search}%`)
  const { data } = await q
  return data ?? []
}

export async function setUserVerified(id, value) {
  return supabase.from('users').update({ is_verified: value }).eq('id', id)
}
export async function setUserSuspended(id, value) {
  return supabase.from('users').update({ is_suspended: value }).eq('id', id)
}

// --- Products ----------------------------------------------------------------
export async function listAdminProducts({ search = '', category = null } = {}) {
  if (!isSupabaseConfigured) return []
  let q = supabase
    .from('products')
    .select('*, seller:seller_id(id, full_name, business_name)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (category) q = q.eq('category', category)
  if (search) q = q.ilike('title', `%${search}%`)
  const { data } = await q
  return data ?? []
}
export async function removeProduct(id) {
  return supabase.from('products').delete().eq('id', id)
}

// --- Feedback ----------------------------------------------------------------
export async function listFeedback({ type = null, status = null } = {}) {
  if (!isSupabaseConfigured) return []
  let q = supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(200)
  if (type) q = q.eq('type', type)
  if (status) q = q.eq('status', status)
  const { data } = await q
  return data ?? []
}
export async function setFeedbackStatus(id, status) {
  return supabase.from('feedback').update({ status }).eq('id', id)
}

// --- Verifications -----------------------------------------------------------
export async function listVerifications({ status = 'pending' } = {}) {
  if (!isSupabaseConfigured) return []
  let q = supabase
    .from('verification_requests')
    .select('*, user:user_id(id, full_name, business_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (status) q = q.eq('status', status)
  const { data } = await q
  return data ?? []
}
export async function decideVerification(id, status) {
  return supabase.from('verification_requests').update({ status }).eq('id', id)
}

// --- Reports -----------------------------------------------------------------
export async function listReports({ reason = null, status = null } = {}) {
  if (!isSupabaseConfigured) return []
  let q = supabase
    .from('reports')
    .select('*, reporter:reporter_id(full_name, business_name), reported_user:reported_user_id(id, full_name, business_name), product:reported_product_id(id, title)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (reason) q = q.eq('reason', reason)
  if (status) q = q.eq('status', status)
  const { data } = await q
  return data ?? []
}
export async function setReportStatus(id, status) {
  return supabase.from('reports').update({ status }).eq('id', id)
}
export async function listFlaggedSellers() {
  if (!isSupabaseConfigured) return []
  const { data } = await supabase.from('flagged_sellers').select('*').order('report_count', { ascending: false })
  return data ?? []
}

/** Send a warning notification to a user (admin moderation action). */
export async function warnUser(userId, message = 'Your account was flagged for review. Please follow our community guidelines.') {
  return supabase.from('notifications').insert({ user_id: userId, type: 'admin_warning', message })
}

/** CSV string from an array of objects. */
export function toCsv(rows, columns) {
  const head = columns.join(',')
  const body = rows
    .map((r) => columns.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  return `${head}\n${body}`
}
