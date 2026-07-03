import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from '../ui/Sheet'
import Input from '../ui/Input'
import Pill from '../ui/Pill'
import { SearchIcon } from '../icons'
import { CATEGORIES } from '../../lib/categories'

/** Quick search overlay; routes to Explore with the query/category. */
export default function SearchSheet({ open, onClose }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const go = (params) => {
    navigate(`/explore?${params}`)
    onClose()
  }

  const submit = (e) => {
    e.preventDefault()
    if (query.trim()) go(`q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Search SociaMart">
      <form onSubmit={submit}>
        <Input
          autoFocus
          placeholder="What are you looking for?"
          leftIcon={<SearchIcon className="h-5 w-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Browse categories
      </p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Pill key={c.id} leftIcon={<span>{c.emoji}</span>} onClick={() => go(`category=${c.id}`)}>
            {c.label}
          </Pill>
        ))}
      </div>
    </Sheet>
  )
}
