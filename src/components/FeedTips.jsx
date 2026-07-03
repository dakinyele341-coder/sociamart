import { useState } from 'react'
import { cn } from '../lib/cn'

const STORAGE_KEY = 'sociamart.feedTipsDismissed'

const TIPS = [
  { emoji: '📍', title: 'Shop your area', body: 'Listings are sorted by how close they are to you. Set your location for the best matches.' },
  { emoji: '💬', title: 'Chat on WhatsApp', body: 'Tap the green button on any item to message the seller directly and arrange pickup.' },
  { emoji: '🛡️', title: 'Look for the badge', body: 'Verified Sellers have a blue badge. Check ratings before you buy.' },
]

/** Dismissible 3-card swipeable helper shown to first-time buyers on the feed. */
export default function FeedTips() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [i, setI] = useState(0)

  if (dismissed) return null

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  const next = () => (i < TIPS.length - 1 ? setI(i + 1) : close())
  const tip = TIPS[i]

  return (
    <div className="relative overflow-hidden rounded-2xl bg-navy p-5 text-white shadow-lift">
      <button onClick={close} aria-label="Dismiss tips" className="absolute right-3 top-3 text-white/60 hover:text-white">
        ✕
      </button>

      <div key={i} className="animate-slide-in">
        <span className="text-3xl">{tip.emoji}</span>
        <h3 className="mt-2 text-lg font-bold font-display">{tip.title}</h3>
        <p className="mt-1 text-sm text-white/80">{tip.body}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {TIPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Tip ${idx + 1}`}
              className={cn('h-1.5 rounded-full transition-all', idx === i ? 'w-5 bg-primary' : 'w-1.5 bg-white/30')}
            />
          ))}
        </div>
        <button onClick={next} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold tactile-press">
          {i < TIPS.length - 1 ? 'Next' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
