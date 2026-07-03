import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * 24-hour view count → social-proof pill text. Fetches once on mount
 * (chosen over realtime/polling to avoid one WebSocket channel per card).
 * Returns null pill when fewer than 5 views.
 */
export function useSocialProof(productId) {
  const [viewCount, setViewCount] = useState(0)

  useEffect(() => {
    let active = true
    if (!isSupabaseConfigured || !productId) return
    supabase
      .rpc('get_product_views_24h', { product_uuid: productId })
      .then(({ data }) => {
        if (active) setViewCount(Number(data ?? 0))
      })
    return () => {
      active = false
    }
  }, [productId])

  return { viewCount, ...pillFor(viewCount) }
}

function pillFor(n) {
  if (n < 5) return { pillText: null, pillIcon: null }
  if (n <= 20) return { pillText: `👀 ${n} people viewed this today`, pillIcon: '👀' }
  if (n <= 50) return { pillText: `🔥 ${n} people viewed this today`, pillIcon: '🔥' }
  if (n <= 100) return { pillText: `🔥 Trending · ${n} views today`, pillIcon: '🔥' }
  return { pillText: `⚡ ${n}+ views today`, pillIcon: '⚡' }
}
