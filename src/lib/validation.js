/** Lightweight form validators used by inputs and forms. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim())
}

/** Accepts 080..., +23480..., 23480..., or 10-digit 80... formats. */
export function isValidNgPhone(value) {
  const digits = String(value || '').replace(/[^\d+]/g, '')
  return (
    /^0[789]\d{9}$/.test(digits) ||           // 08012345678
    /^\+?234[789]\d{9}$/.test(digits) ||      // +2348012345678 / 2348012345678
    /^[789]\d{9}$/.test(digits)               // 8012345678
  )
}

/** Pretty-print to +234 80 1234 5678 as the user types (best effort). */
export function formatNgPhoneDisplay(value) {
  const digits = String(value || '').replace(/[^\d]/g, '')
  let local = digits
  if (digits.startsWith('234')) local = digits.slice(3)
  else if (digits.startsWith('0')) local = digits.slice(1)
  local = local.slice(0, 10)
  if (!local) return ''
  const parts = [local.slice(0, 3), local.slice(3, 7), local.slice(7, 10)].filter(Boolean)
  return `+234 ${parts.join(' ')}`.trim()
}

export function isRequired(value) {
  return String(value ?? '').trim().length > 0
}

export function minLength(value, n) {
  return String(value ?? '').trim().length >= n
}

// --- Security: input sanitisation & validation -------------------------------

/** Strip HTML/angle brackets, collapse whitespace, trim, and cap length. */
export function sanitizeText(value, maxLen = 1000) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')   // strip tags
    .replace(/[<>]/g, '')      // strip stray angle brackets
    .trim()
    .slice(0, maxLen)
}

export const MAX_PRICE = 100_000_000 // ₦100m

/** Positive number within a sane maximum. */
export function isValidPrice(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 && n <= MAX_PRICE
}

// Allowed upload types & sizes (checked by MIME, not extension).
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50MB

export function validateImageFile(file) {
  if (!file) return { ok: false, error: 'No file selected' }
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, error: 'Use JPEG, PNG, or WebP images' }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Image must be under 5MB' }
  return { ok: true }
}

export function validateVideoFile(file) {
  if (!file) return { ok: false, error: 'No file selected' }
  if (!VIDEO_TYPES.includes(file.type)) return { ok: false, error: 'Use MP4 or MOV videos' }
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: 'Video must be under 50MB' }
  return { ok: true }
}
