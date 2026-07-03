import { useState, useEffect } from 'react'
import Sheet from './Sheet'
import Pill from './Pill'
import Toggle from './Toggle'
import Button from './Button'
import { CATEGORIES } from '../../lib/categories'
import { formatNairaCompact } from '../../lib/format'
import { cn } from '../../lib/cn'

const PRICE_CAP = 1_000_000
const DISTANCES = [
  { label: '1 km', value: 1 },
  { label: '5 km', value: 5 },
  { label: '20 km', value: 20 },
  { label: '50 km', value: 50 },
  { label: 'Anywhere', value: null },
]
const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'nearest', label: 'Nearest' },
  { id: 'views', label: 'Most viewed' },
  { id: 'price-asc', label: 'Price: L–H' },
  { id: 'price-desc', label: 'Price: H–L' },
]

const EMPTY = { categories: [], priceMin: 0, priceMax: PRICE_CAP, maxDistanceKm: null, availableOnly: false, sort: 'newest' }

export default function FilterSheet({ open, onClose, value = {}, onApply }) {
  const [draft, setDraft] = useState({ ...EMPTY, ...value })
  useEffect(() => {
    if (open) setDraft({ ...EMPTY, ...value })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleCategory = (id) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(id) ? d.categories.filter((c) => c !== id) : [...d.categories, id],
    }))

  const apply = () => {
    onApply?.(draft)
    onClose()
  }
  const reset = () => setDraft({ ...EMPTY })

  return (
    <Sheet open={open} onClose={onClose} title="Filter & sort">
      <div className="space-y-5">
        <Section title="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Pill key={c.id} active={draft.categories.includes(c.id)} leftIcon={<span>{c.emoji}</span>} onClick={() => toggleCategory(c.id)}>
                {c.label}
              </Pill>
            ))}
          </div>
        </Section>

        <Section title="Price range">
          <DualRange
            min={0}
            max={PRICE_CAP}
            step={1000}
            valueMin={draft.priceMin}
            valueMax={draft.priceMax}
            onChange={(lo, hi) => setDraft((d) => ({ ...d, priceMin: lo, priceMax: hi }))}
          />
          <div className="mt-1 flex justify-between text-xs font-medium text-[var(--color-text-muted)]">
            <span>{formatNairaCompact(draft.priceMin)}</span>
            <span>{draft.priceMax >= PRICE_CAP ? `${formatNairaCompact(PRICE_CAP)}+` : formatNairaCompact(draft.priceMax)}</span>
          </div>
        </Section>

        <Section title="Distance">
          <div className="flex flex-wrap gap-2">
            {DISTANCES.map((d) => (
              <Pill key={d.label} active={draft.maxDistanceKm === d.value} onClick={() => setDraft((p) => ({ ...p, maxDistanceKm: d.value }))}>
                {d.label}
              </Pill>
            ))}
          </div>
        </Section>

        <div className="rounded-xl border border-[var(--color-border)] p-3">
          <Toggle checked={draft.availableOnly} onChange={(v) => setDraft((d) => ({ ...d, availableOnly: v }))} label="Available for sale only" />
        </div>

        <Section title="Sort by">
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <Pill key={s.id} active={draft.sort === s.id} onClick={() => setDraft((d) => ({ ...d, sort: s.id }))}>
                {s.label}
              </Pill>
            ))}
          </div>
        </Section>

        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>Reset</Button>
          <Button fullWidth onClick={apply}>Apply Filters</Button>
        </div>
      </div>
    </Sheet>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{title}</p>
      {children}
    </div>
  )
}

/** Two overlaid range inputs forming a dual-handle slider. */
function DualRange({ min, max, step, valueMin, valueMax, onChange }) {
  const pct = (v) => ((v - min) / (max - min)) * 100
  return (
    <div className="relative h-6">
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-navy/15 dark:bg-white/15" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
        style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax - step), valueMax)}
        className={cn('dual-range pointer-events-none absolute inset-0 w-full appearance-none bg-transparent')}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin + step))}
        className={cn('dual-range pointer-events-none absolute inset-0 w-full appearance-none bg-transparent')}
      />
    </div>
  )
}
