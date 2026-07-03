import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import ProductCard from '../components/ProductCard'
import { ProductCardSkeleton } from '../components/ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { listSavedProducts, toggleSave } from '../lib/saves'

export default function SavedItemsPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }
    listSavedProducts(user.id).then((data) => {
      setProducts(data)
      setLoading(false)
    })
  }, [user, isAuthenticated])

  const unsave = async (e, product) => {
    e.stopPropagation()
    setProducts((prev) => prev.filter((p) => p.id !== product.id)) // optimistic
    await toggleSave(user.id, product.id, true)
    toast.info('Removed from saved')
  }

  if (!isAuthenticated) {
    return (
      <div className="grid place-items-center gap-3 py-20 text-center">
        <span className="text-3xl">🔖</span>
        <p className="font-semibold">Sign in to see your saved items</p>
        <Button onClick={() => navigate('/auth', { state: { from: '/saved' } })}>Sign in</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display tracking-tight">Saved items</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
          <span className="text-3xl">🤍</span>
          <p className="font-semibold">Nothing saved yet</p>
          <p className="max-w-[240px] text-sm text-[var(--color-text-muted)]">Tap 🤍 on products you love to save them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} onOpen={() => navigate(`/product/${p.id}`)} />
              <button
                onClick={(e) => unsave(e, p)}
                aria-label="Remove from saved"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white tactile-press"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="currentColor"><path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
