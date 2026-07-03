/**
 * WhatsApp click-to-chat helpers for Nigerian sellers.
 * Numbers are normalised to international format (234XXXXXXXXXX, no +).
 */

/** Normalise a Nigerian phone number to WhatsApp's `wa.me` format (no plus). */
export function normalizeNgNumber(raw) {
  if (!raw) return null
  let digits = String(raw).replace(/[^\d+]/g, '')

  if (digits.startsWith('+')) digits = digits.slice(1)

  // 0XXXXXXXXXX (local) -> 234XXXXXXXXXX
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '234' + digits.slice(1)
  }
  // 8XXXXXXXXX / 7XXXXXXXXX / 9XXXXXXXXX (10 digits, no leading 0) -> prefix 234
  else if (digits.length === 10 && /^[789]/.test(digits)) {
    digits = '234' + digits
  }
  // Already 234XXXXXXXXXX
  else if (digits.startsWith('234')) {
    // keep as-is
  }

  return /^234\d{10}$/.test(digits) ? digits : null
}

/**
 * Build a wa.me click-to-chat URL with a pre-filled message.
 * Returns null when the number is invalid.
 */
export function buildWhatsAppLink(phone, message = '') {
  const number = normalizeNgNumber(phone)
  if (!number) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${text}`
}

/** Pre-filled enquiry message a buyer sends about a specific product. */
export function productEnquiryMessage(product, buyerName = '') {
  const greeting = buyerName ? `Hi, I'm ${buyerName}. ` : 'Hi! '
  return (
    `${greeting}I saw your "${product?.title ?? 'item'}" on SociaMart` +
    (product?.price ? ` (₦${Number(product.price).toLocaleString('en-NG')})` : '') +
    `. Is it still available?`
  )
}
