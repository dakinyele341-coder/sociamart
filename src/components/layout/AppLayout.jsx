import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import LocationSheet from './LocationSheet'
import SearchSheet from './SearchSheet'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const SELLER_ROLES = ['seller', 'both', 'admin']

/** Mobile-first shell: centered max-w-md column, sticky header, bottom nav. */
export default function AppLayout() {
  const [locationOpen, setLocationOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { profile, user } = useAuth()
  const toast = useToast()

  // Realtime: notify sellers when a new request lands (theirs or an open broadcast).
  useEffect(() => {
    if (!isSupabaseConfigured || !user || !SELLER_ROLES.includes(profile?.role)) return
    const channel = supabase
      .channel('product-requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'product_requests' },
        ({ new: req }) => {
          const forMe = req.seller_id === user.id
          const openBroadcast = req.status === 'open' && !req.seller_id
          if (forMe || openBroadcast) {
            toast.info(`🔔 New request: ${req.title}`)
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, profile?.role, toast])

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-[var(--color-bg)]">
      <Header
        onLocationClick={() => setLocationOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />

      {/* pb leaves room for the floating bottom nav */}
      <main className="px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <BottomNav />

      <LocationSheet open={locationOpen} onClose={() => setLocationOpen(false)} />
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
