// SociaMart — get_feed Edge Function (Deno)
// Weighted multi-signal feed scoring with exploration interleaving and
// diversity caps. Deploy with: supabase functions deploy get_feed
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Candidate {
  id: string
  seller_id: string
  title: string
  price: number
  category: string
  images: string[]
  video_url: string | null
  is_available: boolean
  town: string | null
  state: string | null
  views: number
  created_at: string
  distance_km: number | null
  seller_name: string | null
  seller_avatar: string | null
  seller_verified: boolean
  seller_whatsapp: string | null
  views_7d: number
  saves_7d: number
  whatsapp_taps_7d: number
  impressions_7d: number
  comments_count: number
  seller_impressions_7d: number
  is_following: boolean
  is_saved: boolean
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { page = 1, page_size = 10, user_id = null, user_location = null } = await req.json()
    const lat = user_location?.lat ?? null
    const lng = user_location?.lng ?? user_location?.lon ?? null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!,
    )

    const { data, error } = await supabase.rpc('get_feed_candidates', {
      current_user_id: user_id,
      user_lat: lat,
      user_lng: lng,
      radius_m: 100000,
    })
    if (error) throw error
    const candidates = (data ?? []) as Candidate[]

    // --- Engagement rate, normalized to the candidate-set average ----------
    const engagement = (c: Candidate) =>
      (c.views_7d + c.saves_7d * 2 + c.whatsapp_taps_7d * 3) / Math.max(c.impressions_7d, 1)
    const avgEng = candidates.length
      ? candidates.reduce((s, c) => s + engagement(c), 0) / candidates.length
      : 1
    const maxSellerImp = Math.max(1, ...candidates.map((c) => c.seller_impressions_7d))

    // --- Category affinity (personalization) from recent behaviour ----------
    const affinity = new Map<string, number>()
    if (user_id) {
      const { data: ev } = await supabase
        .from('analytics_events')
        .select('event_name, properties, created_at')
        .in('event_name', ['product_view', 'save', 'search'])
        .eq('user_id', user_id)
        .gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
        .limit(500)
      for (const e of ev ?? []) {
        const cat = (e.properties as Record<string, string>)?.category
        if (cat) affinity.set(cat, (affinity.get(cat) ?? 0) + 1)
      }
    }
    const affinityTotal = [...affinity.values()].reduce((a, b) => a + b, 0)

    const now = Date.now()
    const scored = candidates.map((c) => {
      const hours = (now - new Date(c.created_at).getTime()) / 36e5
      const recency = Math.exp(-hours / 48)
      const proximity = c.distance_km == null ? 0.5 : 1 / (1 + c.distance_km / 10)
      const engRate = Math.min(1, engagement(c) / Math.max(avgEng, 1e-6))
      const personalization = affinityTotal
        ? (affinity.get(c.category) ?? 0) / affinityTotal
        : 0.5
      const fairReach = 1 - c.seller_impressions_7d / maxSellerImp
      let score = recency * 0.35 + proximity * 0.2 + engRate * 0.2 + personalization * 0.15 + fairReach * 0.1
      if (c.is_following) score += 0.15
      return { c, score, fairReach }
    })

    scored.sort((a, b) => b.score - a.score)

    // --- Exploration: bottom 25th percentile of seller impressions ----------
    const impVals = [...candidates.map((c) => c.seller_impressions_7d)].sort((a, b) => a - b)
    const p25 = impVals[Math.floor(impVals.length * 0.25)] ?? 0
    const exploration = scored.filter((s) => s.c.seller_impressions_7d <= p25)

    // --- Build the requested page with diversity caps -----------------------
    const start = (page - 1) * page_size
    const ranked = [...scored]
    const result: Candidate[] = []
    const perSeller: Record<string, number> = {}
    const explorationSlots = Math.max(1, Math.round(page_size * 0.2))
    let explorationUsed = 0
    let i = start

    while (result.length < page_size && (i < ranked.length || exploration.length)) {
      // Carve out ~20% exploration slots, interleaved roughly every 5 posts.
      const wantExploration =
        explorationUsed < explorationSlots && result.length > 0 && result.length % 5 === 0
      let pick = null as null | { c: Candidate }
      if (wantExploration) {
        const idx = Math.floor(Math.random() * exploration.length)
        pick = exploration.splice(idx, 1)[0] || null
        if (pick) explorationUsed++
      }
      if (!pick) {
        pick = ranked[i] || null
        i++
      }
      if (!pick) break
      const sid = pick.c.seller_id
      const last = result[result.length - 1]
      const consecutive = last && last.seller_id === sid
      if ((perSeller[sid] ?? 0) >= 3 || consecutive) continue
      if (result.find((r) => r.id === pick!.c.id)) continue
      perSeller[sid] = (perSeller[sid] ?? 0) + 1
      result.push(pick.c)
    }

    return new Response(
      JSON.stringify({ page, page_size, items: result, has_more: i < ranked.length }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
