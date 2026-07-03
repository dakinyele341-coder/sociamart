import { Link } from 'react-router-dom'
import { useLocation as useGeoLocation } from '../../context/LocationContext'
import { SearchIcon, BellIcon, PinIcon } from '../icons'

/** Top app bar: branding, location chip, search, notifications. */
export default function Header({ onSearchClick, onLocationClick }) {
  const { location } = useGeoLocation()

  return (
    <header className="sticky top-0 z-30 mx-auto max-w-md border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 tactile-press" aria-label="SociaMart home">
          <img src="/logo/logo-icon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-extrabold font-display tracking-tight">
            Socia<span className="text-primary">Mart</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onLocationClick}
            className="flex max-w-[120px] items-center gap-1 rounded-full bg-navy/5 px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] dark:bg-white/10 tactile-press"
          >
            <PinIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{location?.town || 'Set location'}</span>
          </button>

          <button
            onClick={onSearchClick}
            aria-label="Search"
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--color-text)] hover:bg-navy/5 dark:hover:bg-white/10 tactile-press"
          >
            <SearchIcon className="h-5 w-5" />
          </button>

          <button
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full text-[var(--color-text)] hover:bg-navy/5 dark:hover:bg-white/10 tactile-press"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-[var(--color-surface)]" />
          </button>
        </div>
      </div>
    </header>
  )
}
