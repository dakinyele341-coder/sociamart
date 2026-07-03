import { supabase, isSupabaseConfigured } from './supabase'
import { sanitizeText } from './validation'

export const REPORT_REASONS = [
  { id: 'scam', label: 'Scam / Fraud' },
  { id: 'fake_item', label: 'Fake or Misleading Item' },
  { id: 'inappropriate_content', label: 'Inappropriate Content' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'spam', label: 'Spam' },
  { id: 'other', label: 'Other' },
]

/**
 * Submit a report via the dedupe-aware RPC.
 * Returns 'ok' | 'duplicate' | 'error'.
 */
export async function submitReport({ reportedUserId = null, reportedProductId = null, reason, details }) {
  if (!isSupabaseConfigured) return 'ok'
  const { data, error } = await supabase.rpc('submit_report', {
    p_reported_user_id: reportedUserId,
    p_reported_product_id: reportedProductId,
    p_reason: reason,
    p_details: sanitizeText(details, 500) || null,
  })
  if (error) return 'error'
  return data || 'ok'
}
