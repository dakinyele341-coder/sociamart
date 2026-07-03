import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useLocation, geocodePlace } from '../context/LocationContext'
import { useAuth } from '../context/AuthContext'
import { useBlocks } from '../context/BlockContext'
import { DEMO_PRODUCTS } from './useProducts'

const PAGE_SIZE = 10
const SELLER_SELECT = 'seller:seller_id(id, full_name, business_name, avatar_url, is_verified, rating, rating_count, whatsapp, phone)'

// Remembered across mounts so we don't keep hitting a not-yet-deployed function.
let edgeAvailable = null // null = unknown, false = unavailable

function haversineKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

function applyFilters(list, filters = {}) {
  let out = [...list]
  const { categories = [], priceMin, priceMax, maxDistanceKm, availableOnly, sort = 'smart' } = filters
  if (categories.length) out = out.filter((p) => categories.includes(p.category))
  if (priceMin != null && priceMin !== '') out = out.filter((p) => Number(p.price) >= Number(priceMin))
  if (priceMax != null && priceMax !== '') out = out.filter((p) => Number(p.price) <= Number(priceMax))
  if (maxDistanceKm) out = out.filter((p) => p.distance_km == null || p.distance_km <= maxDistanceKm)
  if (availableOnly) out = out.filter((p) => p.is_available !== false)

  if (sort === 'newest') out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  else if (sort === 'nearest') out.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9))
  else if (sort === 'views') out.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
  else if (sort === 'price-asc') out.sort((a, b) => a.price - b.price)
  else if (sort === 'price-desc') out.sort((a, b) => b.price - a.price)
  return out
}

/**
 * Personalized feed. Tries the `get_feed` edge function; falls back to a
 * client-side ranking over recent products so the feed always renders.
 */
export function useFeed({ mode = 'foryou', filters = {} } = {}) {
  const { location } = useLocation()
  const { user } = useAuth()
  const { blockedIds } = useBlocks()

  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const rankedRef = useRef([]) // full fallback list
  const followingRef = useRef(new Set())
  const filtersKey = JSON.stringify(filters)

  // Rank a raw product list by recency + proximity + follow boost.
  const rankProducts = useCallback(
    (list) => {
      const now = Date.now()
      return list
        .map((p) => {
          const place = location && p.town ? geocodePlace(p.town) : null
          const distance_km =
            location && place ? haversineKm({ lat: location.lat, lon: location.lon }, { lat: place.lat, lon: place.lon }) : p.distance_km ?? null
          const hours = (now - new Date(p.created_at).getTime()) / 36e5
          const recency = Math.exp(-hours / 48)
          const proximity = distance_km == null ? 0.5 : 1 / (1 + distance_km / 10)
          let score = recency * 0.6 + proximity * 0.4
          if (followingRef.current.has(p.seller_id)) score += 0.15
          return { ...p, distance_km, _score: score }
        })
        .sort((a, b) => b._score - a._score)
    },
    [location]
  )

  const loadFallback = useCallback(async () => {
    if (!isSupabaseConfigured) {
      rankedRef.current = rankProducts(DEMO_PRODUCTS)
      return
    }
    if (user) {
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
      followingRef.current = new Set((follows ?? []).map((f) => f.following_id))
    }
    let query = supabase
      .from('products')
      .select(`*, ${SELLER_SELECT}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200)
    if (mode === 'following') {
      const ids = [...followingRef.current]
      if (ids.length === 0) {
        rankedRef.current = []
        return
      }
      query = query.in('seller_id', ids)
    }
    const { data } = await query
    const ranked = mode === 'following'
      ? (data ?? []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      : rankProducts(data ?? [])
    rankedRef.current = ranked
  }, [mode, user, rankProducts])

  // Try the edge function for one page; null => caller should use fallback.
  const tryEdge = useCallback(
    async (pageNum) => {
      if (mode !== 'foryou' || !isSupabaseConfigured || edgeAvailable === false) return null
      try {
        const { data, error } = await supabase.functions.invoke('get_feed', {
          body: {
            page: pageNum,
            page_size: PAGE_SIZE,
            user_id: user?.id ?? null,
            user_location: location ? { lat: location.lat, lng: location.lon } : null,
          },
        })
        if (error || !data?.items) throw error || new Error('no items')
        edgeAvailable = true
        return data
      } catch {
        edgeAvailable = false
        return null
      }
    },
    [mode, user, location]
  )

  const fetchPage = useCallback(
    async (pageNum, append) => {
      append ? setLoadingMore(true) : setLoading(true)

      const edge = await tryEdge(pageNum)
      let items
      let more
      if (edge) {
        items = applyFilters(edge.items, filters)
        more = edge.has_more
      } else {
        if (pageNum === 1 || rankedRef.current.length === 0) await loadFallback()
        const all = applyFilters(rankedRef.current, filters)
        const startIdx = (pageNum - 1) * PAGE_SIZE
        items = all.slice(startIdx, startIdx + PAGE_SIZE)
        more = startIdx + PAGE_SIZE < all.length
      }

      setPosts((prev) => {
        const next = append ? [...prev, ...items] : items
        // de-dupe by id
        const seen = new Set()
        return next.filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
      })
      setHasMore(more)
      append ? setLoadingMore(false) : setLoading(false)
    },
    [tryEdge, loadFallback, filters]
  )

  // Reset + load page 1 whenever mode / filters / location / user change.
  useEffect(() => {
    setPage(1)
    rankedRef.current = []
    fetchPage(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, filtersKey, location?.town, user?.id])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchPage(nextPage, true)
  }, [loading, loadingMore, hasMore, page, fetchPage])

  // Hide blocked sellers (belt-and-braces; the edge fn already filters them).
  const visiblePosts = useMemo(
    () => (blockedIds.size ? posts.filter((p) => !blockedIds.has(p.seller_id)) : posts),
    [posts, blockedIds]
  )

  return { posts: visiblePosts, loading, loadingMore, hasMore, loadMore, refetch: () => fetchPage(1, false) }
}
