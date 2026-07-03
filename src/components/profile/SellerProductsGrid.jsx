import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Pill from '../ui/Pill'
import ProductCard from '../ProductCard'
import { ProductCardSkeleton } from '../ui/Skeleton'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'unavailable', label: 'Not Available' },
]

/** Active-product grid with an availability filter bar. */
export default function SellerProductsGrid({ products, loading, seller }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const shown = useMemo(() => {
    if (filter === 'available') return products.filter((p) => p.is_available !== false)
    if (filter === 'unavailable') return products.filter((p) => p.is_available === false)
    return products
  }, [products, filter])

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {FILTERS.map((f) => (
          <Pill key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)} className="flex-1 justify-center">
            {f.label}
          </Pill>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">No products here.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shown.map((p) => (
            <ProductCard key={p.id} product={{ ...p, seller: seller || p.seller }} onOpen={() => navigate(`/product/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
