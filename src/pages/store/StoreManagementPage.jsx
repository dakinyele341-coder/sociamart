import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Toggle from '../../components/ui/Toggle'
import Modal from '../../components/ui/Modal'
import Pill from '../../components/ui/Pill'
import { ProductCardSkeleton } from '../../components/ui/Skeleton'
import { formatNaira } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSellerProducts } from '../../hooks/useProducts'
import { updateProduct, deleteProduct } from '../../lib/products'

export default function StoreManagementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { products, loading, refetch } = useSellerProducts(user?.id, { includeDrafts: true })
  const [tab, setTab] = useState('live')
  const [pendingDelete, setPendingDelete] = useState(null)
  // Local optimistic overrides for the availability toggle.
  const [availOverrides, setAvailOverrides] = useState({})

  const { live, drafts } = useMemo(() => {
    const live = products.filter((p) => p.status !== 'draft')
    const drafts = products.filter((p) => p.status === 'draft')
    return { live, drafts }
  }, [products])

  const shown = tab === 'live' ? live : drafts

  const toggleAvailable = async (product) => {
    const nextVal = !(availOverrides[product.id] ?? product.is_available)
    setAvailOverrides((o) => ({ ...o, [product.id]: nextVal })) // optimistic
    const { error } = await updateProduct(product.id, { is_available: nextVal })
    if (error) {
      setAvailOverrides((o) => ({ ...o, [product.id]: !nextVal })) // revert
      toast.error('Could not update')
    }
  }

  const confirmDelete = async () => {
    const p = pendingDelete
    setPendingDelete(null)
    const { error } = await deleteProduct(p.id)
    if (error) toast.error(error.message)
    else {
      toast.success('Product deleted')
      refetch()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold font-display tracking-tight">My Store</h1>
        <Button size="sm" onClick={() => navigate('/sell/single')}>+ Add</Button>
      </div>

      <div className="flex gap-2">
        <Pill active={tab === 'live'} onClick={() => setTab('live')} className="flex-1 justify-center">
          Live Products ({live.length})
        </Pill>
        <Pill active={tab === 'drafts'} onClick={() => setTab('drafts')} className="flex-1 justify-center">
          Drafts ({drafts.length})
        </Pill>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState tab={tab} onAdd={() => navigate('/sell/single')} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shown.map((p) => (
            <StoreCard
              key={p.id}
              product={p}
              available={availOverrides[p.id] ?? p.is_available}
              onToggle={() => toggleAvailable(p)}
              onEdit={() => navigate('/sell/single', { state: { product: p } })}
              onDelete={() => setPendingDelete(p)}
              onOpen={() => p.status !== 'draft' && navigate(`/product/${p.id}`)}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete product?"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="danger" fullWidth onClick={confirmDelete}>Delete</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          “{pendingDelete?.title}” will be permanently removed. This can't be undone.
        </p>
      </Modal>
    </div>
  )
}

function StoreCard({ product, available, onToggle, onEdit, onDelete, onOpen }) {
  const cover = product.images?.[0]
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
      <button onClick={onOpen} className="relative block aspect-square w-full bg-navy/5">
        {cover ? (
          <img src={cover} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full place-items-center text-navy/20">No photo</span>
        )}
        {product.status === 'draft' && (
          <span className="absolute left-2 top-2 rounded bg-navy/70 px-1.5 py-0.5 text-[10px] font-bold text-white">Draft</span>
        )}
      </button>

      <div className="space-y-2 p-3">
        <p className="line-clamp-1 text-sm font-semibold">{product.title}</p>
        <div className="flex items-center justify-between">
          <p className="text-base font-extrabold font-display text-primary">{formatNaira(product.price)}</p>
          <span className="text-xs text-[var(--color-text-muted)]">👁 {product.views ?? 0}</span>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2">
          <span className="text-xs text-[var(--color-text-muted)]">For sale</span>
          <Toggle checked={available} onChange={onToggle} />
        </div>

        <div className="flex gap-2">
          <button onClick={onEdit} className="flex-1 rounded-lg border border-[var(--color-border)] py-1.5 text-xs font-semibold tactile-press">Edit</button>
          <button onClick={onDelete} className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error tactile-press">Delete</button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ tab, onAdd }) {
  return (
    <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
      <span className="text-3xl">{tab === 'live' ? '🏪' : '📝'}</span>
      <p className="font-semibold">{tab === 'live' ? 'Your store is empty' : 'No drafts'}</p>
      <p className="max-w-[220px] text-sm text-[var(--color-text-muted)]">
        {tab === 'live' ? 'Add your first product now and get discovered.' : 'Products saved as drafts will appear here.'}
      </p>
      {tab === 'live' && <Button className="mt-1" onClick={onAdd}>Add Product</Button>}
    </div>
  )
}
