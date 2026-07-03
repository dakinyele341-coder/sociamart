/** Share a product link: native share sheet when available, else clipboard. */
export async function shareProduct(product) {
  const url = `${window.location.origin}/product/${product.id}`
  const title = product.title || 'SociaMart'
  if (navigator.share) {
    try {
      await navigator.share({ title, text: `${title} on SociaMart`, url })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
