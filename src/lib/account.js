import { supabase, isSupabaseConfigured } from './supabase'
import { uploadImage } from './storage'

/** Upload an avatar or banner image; returns a public URL. */
export async function uploadProfileImage(userId, file, kind = 'avatar') {
  // Both live in the public `avatars` bucket under the user's folder.
  const { url, error } = await uploadImage('avatars', userId, file)
  return { url, error, kind }
}

/** Soft-delete (deactivate) the signed-in account via RPC, then sign out. */
export async function deactivateAccount() {
  if (!isSupabaseConfigured) return { error: null }
  const { error } = await supabase.rpc('deactivate_account')
  if (!error) await supabase.auth.signOut()
  return { error }
}
