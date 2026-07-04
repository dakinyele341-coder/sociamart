import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../components/ui/Input'
import Pill from '../components/ui/Pill'
import Avatar from '../components/ui/Avatar'
import ProductCard from '../components/ProductCard'
import { ProductCardSkeleton } from '../components/ui/Skeleton'
import { SearchIcon } from '../components/icons'
import { NewSellerBadge, VerifiedSellerBadge } from '../components/ui/Badge'
import { CATEGORIES } from '../lib/categories'
import { useProducts } from '../hooks/useProducts'
import { useLocation, geocodePlace } from '../context/LocationContext'
import { useBlocks } from '../context/BlockContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { timeAgo } from '../lib/format'
import { track } from '../lib/posthog'

const RECENTS_KEY = 'sociamart.recentSearches'

// Shop-by-budget ranges tuned for the Nigerian market.
const BUDGETS = [
  { id: 'u5', label: 'Under ₦5k', min: 0, max: 5_000 },
  { id: '5-20', label: '₦5k – ₦20k', min: 5_000, max: 20_000 },
  { id: '20-50', label: '₦20k – ₦50k', min: 20_000, max: 50_000 },
  { id: '50-200', label: '₦50k – ₦200k', min: 50_000, max: 200_000 },
  { id: '200+', label: '₦200k+', min: 200_000, max: null },
]

function haversineKm(a, b) {
  if (!a || !b) return Infinity
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export default function ExplorePage() {
  const navigate = useNavigate()
  const { location } = useLocation()
  const { blockedIds } = useBlocks()
  const { products: rawProducts, loading } = useProducts({ limit: 100 })
  const products = useMemo(
    () => (blockedIds.size ? rawProducts.filter((p) => !blockedIds.has(p.seller_id)) : rawProducts),
    [rawProducts, blockedIds]
  )

  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [budget, setBudget] = useState(null) // { min, max } | null
  const [recents, setRecents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [newSellers, setNewSellers] = useState([])

  // Debounce the search input (300ms).
  const debounce = useRef(null)
  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => setQuery(input.trim()), 300)
    return () => clearTimeout(debounce.current)
  }, [input])

  // New sellers (joined in the last 7 days).
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setNewSellers([{ id: 'demo-s1', business_name: 'Fresh Finds NG', is_verified: false, created_at: new Date().toISOString() }])
      return
    }
    const since = new Date(Date.now() - 7 * 864e5).toISOString()
    supabase
      .from('users')
      .select('id, full_name, business_name, avatar_url, is_verified, created_at')
      .gte('created_at', since)
      .in('role', ['seller', 'both'])
      .eq('is_suspended', false)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setNewSellers(data ?? []))
  }, [])

  const withDistance = useMemo(
    () =>
      products.map((p) => {
        const place = location && p.town ? geocodePlace(p.town) : null
        const distance_km = location && place ? haversineKm({ lat: location.lat, lon: location.lon }, { lat: place.lat, lon: place.lon }) : null
        return { ...p, distance_km }
      }),
    [products, location]
  )

  const searching = query.length > 0 || category || budget
  const results = useMemo(() => {
    let list = withDistance
    if (category) list = list.filter((p) => p.category === category)
    if (budget) {
      list = list.filter((p) => {
        const n = Number(p.price)
        return n >= budget.min && (budget.max == null || n <= budget.max)
      })
    }
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    // Budget shoppers see cheapest-first; otherwise keep default ordering.
    if (budget) list = [...list].sort((a, b) => a.price - b.price)
    return list
  }, [withDistance, query, category, budget])

  const nearYou = useMemo(() => withDistance.filter((p) => p.distance_km != null && p.distance_km <= 5).slice(0, 6), [withDistance])
  const trending = useMemo(() => [...withDistance].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 10), [withDistance])

  const commitSearch = (term) => {
    const t = term.trim()
    if (!t) return
    track('search_performed', { query_length: t.length })
    const next = [t, ...recents.filter((r) => r !== t)].slice(0, 6)
    setRecents(next)
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold font-display tracking-tight">Explore</h1>

      <form onSubmit={(e) => { e.preventDefault(); commitSearch(input) }}>
        <Input
          placeholder="Search products, brands…"
          leftIcon={<SearchIcon className="h-5 w-5" />}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>

      {/* Recent searches (only when not actively searching) */}
      {!searching && recents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Recent</span>
          {recents.map((r) => (
            <Pill key={r} onClick={() => setInput(r)}>{r}</Pill>
          ))}
        </div>
      )}

      {/* Category rail */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Pill active={!category} onClick={() => setCategory(null)}>All</Pill>
        {CATEGORIES.map((c) => (
          <Pill key={c.id} active={category === c.id} leftIcon={<span>{c.emoji}</span>} onClick={() => setCategory(category === c.id ? null : c.id)}>
            {c.label}
          </Pill>
        ))}
      </div>

      {/* Shop by budget */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">💰 Shop by budget</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {BUDGETS.map((b) => (
            <Pill
              key={b.id}
              active={budget?.id === b.id}
              onClick={() => {
                const next = budget?.id === b.id ? null : b
                setBudget(next)
                if (next) track('filter_applied', { filter_types_used: ['budget'], budget: b.id })
              }}
            >
              {b.label}
            </Pill>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : searching ? (
        <SearchResults results={results} onOpen={(p) => navigate(`/product/${p.id}`)} />
      ) : (
        <div className="space-y-6">
          <Section title="📍 Near You" items={nearYou} onOpen={(p) => navigate(`/product/${p.id}`)} empty="No nearby items — set your location." />
          <Section title="🔥 Trending" items={trending} onOpen={(p) => navigate(`/product/${p.id}`)} />
          <NewSellersRow sellers={newSellers} onOpen={(id) => navigate(`/seller/${id}`)} />
        </div>
      )}
    </div>
  )
}

function SearchResults({ results, onOpen }) {
  if (results.length === 0) return <p className="py-16 text-center text-sm text-[var(--color-text-muted)]">Nothing matches your filters. Try adjusting your search.</p>
  return (
    <div className="grid grid-cols-2 gap-3">
      {results.map((p) => <ProductCard key={p.id} product={p} onOpen={() => onOpen(p)} />)}
    </div>
  )
}

function Section({ title, items, onOpen, empty }) {
  return (
    <div>
      <h2 className="mb-2 font-bold font-display">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{empty || 'Nothing here yet.'}</p>
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {items.map((p) => (
            <div key={p.id} className="w-40 shrink-0">
              <ProductCard product={p} onOpen={() => onOpen(p)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NewSellersRow({ sellers, onOpen }) {
  if (!sellers.length) return null
  return (
    <div>
      <h2 className="mb-2 font-bold font-display">✨ New Sellers</h2>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {sellers.map((s) => (
          <button
            key={s.id}
            onClick={() => onOpen(s.id)}
            className="tactile-card flex w-32 shrink-0 flex-col items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center"
          >
            <Avatar src={s.avatar_url} name={s.business_name || s.full_name} size="lg" />
            <span className="line-clamp-1 text-xs font-semibold">{s.business_name || s.full_name || 'Seller'}</span>
            {s.is_verified ? <VerifiedSellerBadge /> : <NewSellerBadge />}
            <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(s.created_at)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
