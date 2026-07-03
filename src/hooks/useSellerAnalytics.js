import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const DEMO_STATS = {
  total_views: 128,
  views_7d: 34,
  whatsapp_taps: 12,
  top_product: { id: 'demo-1', title: 'Ankara Two-Piece Set', views: 64 },
  followers: 9,
  followers_7d: 3,
  requests: 2,
}

/** Loads seller dashboard counters via the get_seller_analytics RPC. */
export function useSellerAnalytics(sellerId) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      if (!isSupabaseConfigured || !sellerId) {
        if (active) {
          setStats(isSupabaseConfigured ? null : DEMO_STATS)
          setLoading(false)
        }
        return
      }
      const { data } = await supabase.rpc('get_seller_analytics', { seller_uuid: sellerId })
      if (active) {
        setStats(data ?? null)
        setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [sellerId])

  return { stats, loading }
}
