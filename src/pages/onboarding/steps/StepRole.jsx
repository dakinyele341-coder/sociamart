import { useState } from 'react'
import Button from '../../../components/ui/Button'
import { cn } from '../../../lib/cn'

const ROLES = [
  { id: 'buyer', emoji: '🛍️', title: 'I want to buy', desc: 'Discover and shop from local sellers' },
  { id: 'seller', emoji: '🏪', title: 'I want to sell', desc: 'List products and reach nearby buyers' },
  { id: 'both', emoji: '🔄', title: 'Both', desc: 'Buy from others and sell your own items' },
]

export default function StepRole({ data, onNext, onBack, saving }) {
  const [role, setRole] = useState(data.role && data.role !== 'buyer' ? data.role : null)

  return (
    <div className="space-y-5">
      <div>
        <span className="text-4xl">✨</span>
        <h2 className="mt-3 text-2xl font-extrabold font-display tracking-tight">How will you use SociaMart?</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">You can always change this later in your account.</p>
      </div>

      <div className="space-y-3">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRole(r.id)}
            className={cn(
              'tactile-card flex w-full items-center gap-4 rounded-2xl border bg-[var(--color-surface)] p-4 text-left',
              role === r.id ? 'border-primary ring-2 ring-primary/20' : 'border-[var(--color-border)]'
            )}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-2xl">{r.emoji}</span>
            <span className="min-w-0">
              <span className="block font-bold font-display">{r.title}</span>
              <span className="block text-sm text-[var(--color-text-muted)]">{r.desc}</span>
            </span>
            <span
              className={cn(
                'ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full border-2',
                role === r.id ? 'border-primary bg-primary text-white' : 'border-[var(--color-border)]'
              )}
            >
              {role === r.id && '✓'}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button fullWidth size="lg" disabled={!role} loading={saving} onClick={() => onNext({ role })}>
          Continue
        </Button>
      </div>
    </div>
  )
}
