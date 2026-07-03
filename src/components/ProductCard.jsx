import { useState, memo } from 'react'
import Card from './ui/Card'
import Avatar from './ui/Avatar'
import LazyImage from './ui/LazyImage'
import KebabMenu from './ui/KebabMenu'
import ReportSheet from './ReportSheet'
import { VerifiedSellerBadge, NewSellerBadge } from './ui/Badge'
import { WhatsAppIcon, PinIcon } from './icons'
import { formatNaira, formatDistance, timeAgo } from '../lib/format'
import { categoryLabel } from '../lib/categories'
import { buildWhatsAppLink, productEnquiryMessage } from '../lib/whatsapp'
import { useToast } from '../context/ToastContext'
import { track } from '../lib/posthog'

/** A single product tile in the feed/grid. */
function ProductCard({ product, onOpen }) {
  const toast = useToast()
  const seller = product.seller || {}
  const cover = product.images?.[0]
  const hasVideo = Boolean(product.video_url)
  const [reportOpen, setReportOpen] = useState(false)

  const handleChat = (e) => {
    e.stopPropagation()
    const link = buildWhatsAppLink(seller.whatsapp || seller.phone, productEnquiryMessage(product))
    track('product_whatsapp_click', { product_id: product.id })
    if (link) {
      window.open(link, '_blank', 'noopener')
    } else {
      toast.info('Seller has no WhatsApp number yet')
    }
  }

  return (
    <Card as="article" onClick={() => onOpen?.(product)} className="overflow-hidden">
      <div className="relative aspect-square w-full">
        {/* Video-first products (no photo) preview the clip as their cover. */}
        {hasVideo && !cover ? (
          <video src={product.video_url} className="h-full w-full bg-black object-cover" muted loop autoPlay playsInline preload="metadata" />
        ) : (
          <LazyImage src={cover} alt={product.title} className="h-full w-full" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-navy/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {categoryLabel(product.category)}
        </span>
        {hasVideo && (
          <span className="absolute bottom-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-[10px] text-white backdrop-blur" aria-label="Has video">
            ▶
          </span>
        )}
        <div className="absolute right-1 top-1" onClick={(e) => e.stopPropagation()}>
          <KebabMenu
            onDark
            items={[{ label: 'Report', danger: true, onClick: () => setReportOpen(true) }]}
          />
        </div>
      </div>

      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-[var(--color-text)]">{product.title}</h3>
        <p className="text-base font-extrabold font-display text-primary">{formatNaira(product.price)}</p>

        <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
          <PinIcon className="h-3.5 w-3.5" />
          <span className="truncate">{product.town || 'Nearby'}</span>
          {product.distance_m != null && <span>· {formatDistance(product.distance_m)}</span>}
          <span className="ml-auto">{timeAgo(product.created_at)}</span>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Avatar src={seller.avatar_url} name={seller.full_name} size="xs" />
            <span className="truncate text-xs font-medium">{seller.full_name || 'Seller'}</span>
            {seller.is_verified ? (
              <span className="shrink-0"><VerifiedSellerBadge /></span>
            ) : seller.is_new_seller ? (
              <span className="shrink-0"><NewSellerBadge /></span>
            ) : null}
          </div>
          <button
            onClick={handleChat}
            aria-label="Chat on WhatsApp"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/10 text-success tactile-press"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <ReportSheet
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          productId={product.id}
          userId={product.seller_id || seller.id}
          label="this product"
        />
      </div>
    </Card>
  )
}

export default memo(ProductCard)
