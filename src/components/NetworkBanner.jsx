import { useState, useEffect } from 'react'

/** Slim banner shown when the browser goes offline. */
export default function NetworkBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!offline) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[200] bg-navy px-4 py-2 text-center text-sm font-medium text-white">
      You're offline. Check your connection.
    </div>
  )
}
