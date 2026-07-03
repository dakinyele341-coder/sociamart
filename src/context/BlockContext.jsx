import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { listBlockedIds, blockUser, unblockUser } from '../lib/blocks'

const BlockContext = createContext(null)

export function BlockProvider({ children }) {
  const { user } = useAuth()
  const [blockedIds, setBlockedIds] = useState(new Set())

  const refresh = useCallback(async () => {
    if (!user) {
      setBlockedIds(new Set())
      return
    }
    setBlockedIds(await listBlockedIds(user.id))
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const block = useCallback(async (blockedId) => {
    if (!user) return
    setBlockedIds((prev) => new Set(prev).add(blockedId))
    await blockUser(user.id, blockedId)
  }, [user])

  const unblock = useCallback(async (blockedId) => {
    if (!user) return
    setBlockedIds((prev) => {
      const next = new Set(prev)
      next.delete(blockedId)
      return next
    })
    await unblockUser(user.id, blockedId)
  }, [user])

  const isBlocked = useCallback((id) => blockedIds.has(id), [blockedIds])

  const value = useMemo(() => ({ blockedIds, isBlocked, block, unblock, refresh }), [blockedIds, isBlocked, block, unblock, refresh])
  return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>
}

export function useBlocks() {
  const ctx = useContext(BlockContext)
  if (!ctx) throw new Error('useBlocks must be used within a BlockProvider')
  return ctx
}
