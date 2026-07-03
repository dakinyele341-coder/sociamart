import { supabase, isSupabaseConfigured } from './supabase'
import { validateImageFile, validateVideoFile } from './validation'

function randomName(file) {
  const ext = (file.type.split('/')[1] || 'bin').replace('quicktime', 'mov').replace('jpeg', 'jpg')
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${id}.${ext}`
}

/**
 * Upload a File to a public bucket under the user's own folder ({uid}/...).
 * Validates MIME type + size and assigns a random UUID filename (never
 * user-controlled). Returns a public URL.
 */
export async function uploadImage(bucket, userId, file) {
  // Pick the right validator for the bucket.
  const check = bucket === 'product-videos' ? validateVideoFile(file) : validateImageFile(file)
  if (!check.ok) return { url: null, path: null, error: new Error(check.error) }

  if (!isSupabaseConfigured) {
    return { url: URL.createObjectURL(file), path: null, error: null }
  }
  if (!userId) return { url: null, path: null, error: new Error('Not signed in') }

  const path = `${userId}/${randomName(file)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) return { url: null, path: null, error }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, path, error: null }
}
