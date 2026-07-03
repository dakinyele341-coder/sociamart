import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Pill from '../ui/Pill'
import Input from '../ui/Input'
import ProductCard from '../ProductCard'
import { ProductCardSkeleton } from '../ui/Skeleton'
import { SearchIcon } from '../icons'
import { CATEGORY_MAP } from '../../lib/categories'
import { cn } from '../../lib/cn'

const AVAILABILITY = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'unavailable', label: 'Not Available' },
]

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: '₦ Low – High' },
  { id: 'price-desc', label: '₦ High – Low' },
  { id: 'popular', label: 'Most viewed' },
]

/**
 * Storefront catalog: in-store search, category chips built from the seller's
 * own inventory, availability + sort controls, and a video-aware grid.
 */
export default function SellerProductsGrid({ products, loading, seller }) {
  const navigate = useNavigate()
  const [availability, setAvailability] = useState('all')
  const [category, setCategory] = useState(null)
  const [sort, setSort] = useState('newest')
  const [query, setQuery] = useState('')

  // Category chips from what this store actually stocks.
  const storeCategories = useMemo(() => {
    const counts = new Map()
    for (const p of products) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [products])

  const shown = useMemo(() => {
    let list = products
    if (availability === 'available') list = list.filter((p) => p.is_available !== false)
    if (availability === 'unavailable') list = list.filter((p) => p.is_available === false)
    if (category) list = list.filter((p) => p.category === category)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    list = [...list]
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    else if (sort === 'popular') list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [products, availability, category, sort, query])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* In-store search */}
      {products.length > 4 && (
        <Input
          placeholder="Search this store…"
          leftIcon={<SearchIcon className="h-5 w-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {/* Store categories (only shown when the store spans more than one) */}
      {storeCategories.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Pill active={!category} onClick={() => setCategory(null)} className="px-3 py-1.5 text-xs">
            All ({products.length})
          </Pill>
          {storeCategories.map(([id, count]) => (
            <Pill
              key={id}
              active={category === id}
              onClick={() => setCategory(category === id ? null : id)}
              className="px-3 py-1.5 text-xs"
              leftIcon={<span>{CATEGORY_MAP[id]?.emoji}</span>}
            >
              {CATEGORY_MAP[id]?.label ?? id} ({count})
            </Pill>
          ))}
        </div>
      )}

      {/* Availability + sort row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {AVAILABILITY.map((f) => (
            <button
              key={f.id}
              onClick={() => setAvailability(f.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors tactile-press',
                availability === f.id
                  ? 'bg-navy text-white dark:bg-white dark:text-navy'
                  : 'bg-navy/5 text-[var(--color-text-muted)] dark:bg-white/10'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort products"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-semibold outline-none"
        >
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="grid place-items-center gap-1.5 rounded-2xl border border-dashed border-[var(--color-border)] py-12 text-center">
          <span className="text-2xl">🛍️</span>
          <p className="text-sm font-semibold">{query || category ? 'No items match' : 'No products here yet'}</p>
          {(query || category) && (
            <button onClick={() => { setQuery(''); setCategory(null); setAvailability('all') }} className="text-xs font-semibold text-primary tactile-press">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--color-text-muted)]">
            {shown.length} item{shown.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {shown.map((p) => (
              <ProductCard key={p.id} product={{ ...p, seller: seller || p.seller }} onOpen={() => navigate(`/product/${p.id}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
