import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { useAuth } from '../../context/AuthContext'
import { logEvent } from '../../lib/analytics'
import { EMOJIS, EMOJI_CHAR, fetchReactionCounts, fetchMyReaction, upsertReaction, deleteReaction } from '../../lib/reactions'

/** Emoji reaction bar. `size`: 'sm' for feed cards, 'lg' for the detail page. */
export default function ReactionBar({ productId, size = 'sm' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ fire: 0, love: 0, money: 0, eyes: 0 })
  const [myEmoji, setMyEmoji] = useState(null)
  const [animating, setAnimating] = useState(null)

  useEffect(() => {
    let active = true
    fetchReactionCounts(productId).then((c) => active && setCounts(c))
    if (user) fetchMyReaction(productId).then((e) => active && setMyEmoji(e))
    else setMyEmoji(null)
    return () => {
      active = false
    }
  }, [productId, user])

  const pop = (emoji) => {
    setAnimating(emoji)
    setTimeout(() => setAnimating((a) => (a === emoji ? null : a)), 220)
  }

  const react = async (emoji) => {
    if (!user) {
      navigate('/auth', { state: { from: `/product/${productId}` } })
      return
    }
    pop(emoji)
    const prev = myEmoji
    if (prev === emoji) {
      // toggle off
      setMyEmoji(null)
      setCounts((c) => ({ ...c, [emoji]: Math.max(0, c[emoji] - 1) }))
      await deleteReaction(user.id, productId)
      return
    }
    // add or switch
    setMyEmoji(emoji)
    setCounts((c) => {
      const next = { ...c, [emoji]: c[emoji] + 1 }
      if (prev) next[prev] = Math.max(0, next[prev] - 1)
      return next
    })
    logEvent('reaction_added', { product_id: productId, emoji })
    await upsertReaction(user.id, productId, emoji)
  }

  const big = size === 'lg'

  return (
    <div className={cn('flex items-center', big ? 'gap-2' : 'gap-1.5')}>
      {EMOJIS.map((emoji) => {
        const active = myEmoji === emoji
        const count = counts[emoji]
        return (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            aria-label={emoji}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border transition-colors tactile-press',
              big ? 'px-3 py-1.5 text-base' : 'px-2 py-1 text-sm',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
            )}
          >
            <span className={cn('leading-none', animating === emoji && 'reaction-pop inline-block')}>{EMOJI_CHAR[emoji]}</span>
            {count > 0 && <span className={cn('font-semibold tabular-nums', big ? 'text-sm' : 'text-xs')}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
