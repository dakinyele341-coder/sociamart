import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Fetch products with optional category/search filters.
 * Falls back to demo data when Supabase isn't configured yet.
 */
export function useProducts({ category = null, search = '', sellerId = null, limit = 30 } = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!isSupabaseConfigured) {
      setProducts(DEMO_PRODUCTS.filter((p) => !category || p.category === category))
      setLoading(false)
      return
    }

    let query = supabase
      .from('products')
      .select('*, seller:seller_id(id, full_name, username, avatar_url, is_verified, rating)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category) query = query.eq('category', category)
    if (sellerId) query = query.eq('seller_id', sellerId)
    if (search) query = query.ilike('title', `%${search}%`)

    const { data, error: err } = await query
    if (err) setError(err)
    setProducts(data ?? [])
    setLoading(false)
  }, [category, search, sellerId, limit])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { products, loading, error, refetch: fetchProducts }
}

/** Nearby products via the PostGIS RPC, ordered by distance. */
export function useNearbyProducts({ lat, lon, radiusMeters = 25000, category = null }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      if (!isSupabaseConfigured || lat == null || lon == null) {
        if (active) {
          setProducts(DEMO_PRODUCTS)
          setLoading(false)
        }
        return
      }
      const { data } = await supabase.rpc('products_nearby', {
        lat,
        lon,
        radius_m: radiusMeters,
        category_filter: category,
      })
      if (active) {
        setProducts(data ?? [])
        setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [lat, lon, radiusMeters, category])

  return { products, loading }
}

/** Fetch a single product by id, with its seller joined. */
export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    if (!isSupabaseConfigured) {
      setProduct(DEMO_PRODUCTS.find((p) => p.id === id) ?? null)
      setLoading(false)
      return
    }
    const { data, error: err } = await supabase
      .from('products')
      .select('*, seller:seller_id(id, full_name, business_name, username, avatar_url, is_verified, rating, rating_count, whatsapp, phone, town, state)')
      .eq('id', id)
      .maybeSingle()
    if (err) setError(err)
    setProduct(data ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { product, loading, error, refetch }
}

/** Fetch a seller's own products. Pass `includeDrafts` to also return drafts. */
export function useSellerProducts(sellerId, { includeDrafts = false } = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    if (!isSupabaseConfigured || !sellerId) {
      setProducts(isSupabaseConfigured ? [] : DEMO_PRODUCTS)
      setLoading(false)
      return
    }
    let query = supabase.from('products').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false })
    if (!includeDrafts) query = query.neq('status', 'draft')
    const { data } = await query
    setProducts(data ?? [])
    setLoading(false)
  }, [sellerId, includeDrafts])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { products, loading, refetch }
}

/** Related products: same category, excluding the current one. */
export function useRelatedProducts({ productId, category, limit = 10 }) {
  const [products, setProducts] = useState([])

  useEffect(() => {
    let active = true
    async function run() {
      if (!isSupabaseConfigured) {
        if (active) setProducts(DEMO_PRODUCTS.filter((p) => p.id !== productId).slice(0, limit))
        return
      }
      if (!category) return
      const { data } = await supabase
        .from('products')
        .select('*, seller:seller_id(full_name, business_name, is_verified, rating)')
        .eq('category', category)
        .eq('status', 'active')
        .neq('id', productId)
        .limit(limit)
      if (active) setProducts(data ?? [])
    }
    run()
    return () => {
      active = false
    }
  }, [productId, category, limit])

  return { products }
}

// Demo data so the UI is alive before a backend is connected.
export const DEMO_PRODUCTS = [
  {
    id: 'demo-1',
    title: 'Ankara Two-Piece Set',
    price: 18500,
    category: 'fashion',
    town: 'Ogbomoso',
    state: 'Oyo State',
    images: [],
    distance_m: 1200,
    seller: { full_name: 'Bisi Couture', is_verified: true, rating: 4.8 },
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Tecno Spark 20 (Used, Clean)',
    price: 92000,
    category: 'electronics',
    town: 'Ibadan',
    state: 'Oyo State',
    images: [],
    distance_m: 8400,
    seller: { full_name: 'Gadget Plug', is_verified: false, rating: 4.2 },
    created_at: new Date(Date.now() - 7200_000).toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Fresh Ofada Rice (5kg)',
    price: 7500,
    category: 'groceries',
    town: 'Ogbomoso',
    state: 'Oyo State',
    images: [],
    distance_m: 600,
    seller: { full_name: 'Mama Tunde Foods', is_verified: true, rating: 4.9 },
    created_at: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: 'demo-4',
    title: 'Handmade Leather Sandals',
    price: 12000,
    category: 'handcrafted',
    town: 'Ibadan',
    state: 'Oyo State',
    images: [],
    distance_m: 15300,
    seller: { full_name: 'Naija Crafts', is_verified: true, rating: 4.7 },
    created_at: new Date(Date.now() - 86400_000).toISOString(),
  },
]
