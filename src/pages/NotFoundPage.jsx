import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="grid place-items-center gap-3 py-24 text-center">
      <img src="/logo/logo-icon.svg" alt="" className="h-14 w-14 opacity-60" />
      <h1 className="text-2xl font-extrabold font-display">Page not found</h1>
      <p className="max-w-[260px] text-sm text-[var(--color-text-muted)]">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/">
        <Button>Back to feed</Button>
      </Link>
    </div>
  )
}
