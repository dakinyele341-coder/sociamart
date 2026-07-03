import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { listNotifications, markAllRead as apiMarkAllRead } from '../lib/notifications'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!user) {
      setNotifications([])
      return
    }
    setLoading(true)
    setNotifications(await listNotifications(user.id))
    setLoading(false)
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  // Realtime: prepend new notifications as they arrive.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        ({ new: row }) => setNotifications((prev) => [row, ...prev])
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const markAllRead = useCallback(async () => {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await apiMarkAllRead(user.id)
  }, [user])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  const value = useMemo(
    () => ({ notifications, unreadCount, loading, refetch, markAllRead }),
    [notifications, unreadCount, loading, refetch, markAllRead]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider')
  return ctx
}
