import { useRef, useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { WhatsAppIcon } from './icons'
import { formatNaira } from '../lib/format'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { logEvent } from '../lib/analytics'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { track } from '../lib/posthog'

/** "Your product card is ready" — generates a shareable PNG + opens WhatsApp. */
export default function BuyWhatsAppModal({ open, onClose, product }) {
  const cardRef = useRef(null)
  const { user } = useAuth()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  if (!product) return null
  const seller = product.seller || {}
  const cover = product.images?.[0]
  const productUrl = `${window.location.origin}/product/${product.id}`
  const sellerName = seller.business_name || seller.full_name || 'Seller'

  const message =
    `Hi! I'd like to buy: ${product.title}\n` +
    `Price: ${formatNaira(product.price)}\n` +
    `View item: ${productUrl}`

  const saveCard = async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      // html2canvas is heavy; load it only when a card is actually saved.
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, { useCORS: true, backgroundColor: null, scale: 2 })
      const link = document.createElement('a')
      link.download = `sociamart-${product.id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Card saved to your device')
    } catch {
      toast.error('Could not save card')
    } finally {
      setSaving(false)
    }
  }

  const openWhatsApp = () => {
    const link = buildWhatsAppLink(seller.whatsapp || seller.phone, message)
    logEvent('whatsapp_tap', { product_id: product.id, seller_id: seller.id || product.seller_id })
    track('whatsapp_tap', { product_id: product.id })
    if (link) {
      window.open(link, '_blank', 'noopener')
      onClose()
    } else {
      toast.info('Seller has no WhatsApp number yet')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Your product card is ready">
      {/* Card preview rendered to PNG via html2canvas */}
      <div ref={cardRef} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white">
        <div className="flex items-center justify-between px-3 pt-3">
          <span className="text-sm font-extrabold font-display text-navy">
            Socia<span className="text-primary">Mart</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">Tap to buy</span>
        </div>
        <div className="mt-2 aspect-square w-full bg-navy/5">
          {cover ? (
            <img src={cover} alt={product.title} crossOrigin="anonymous" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-navy/20">No photo</div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <p className="line-clamp-2 font-bold text-navy">{product.title}</p>
          <p className="text-xl font-extrabold font-display text-primary">{formatNaira(product.price)}</p>
          <p className="text-xs text-navy/50">by {sellerName} · SociaMart</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" loading={saving} onClick={saveCard}>💾 Save Card</Button>
        <Button onClick={openWhatsApp} leftIcon={<WhatsAppIcon className="h-5 w-5" />}>Open WhatsApp</Button>
      </div>
    </Modal>
  )
}
