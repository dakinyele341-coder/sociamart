import { useState } from 'react'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Pill from '../ui/Pill'
import { PinIcon } from '../icons'
import { useLocation } from '../../context/LocationContext'
import { useToast } from '../../context/ToastContext'

/** Location picker: GPS detect, typed search (mock geocoder), or quick-pick. */
export default function LocationSheet({ open, onClose }) {
  const { location, places, radiusKm, setRadiusKm, detectLocation, detecting, setPlaceByName, setLocation } =
    useLocation()
  const [query, setQuery] = useState('')
  const toast = useToast()

  const handleDetect = async () => {
    const result = await detectLocation()
    if (result) {
      toast.success(`Located you near ${result.town}`)
      onClose()
    } else {
      toast.error('Could not detect location. Pick a town below.')
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const place = setPlaceByName(query)
    if (place) {
      toast.success(`Location set to ${place.town}`)
      onClose()
    } else {
      toast.info('Town not found. Try one of the suggestions.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Your location">
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        We use your location to show items and sellers near you.
      </p>

      <Button fullWidth onClick={handleDetect} loading={detecting} leftIcon={<PinIcon className="h-5 w-5" />}>
        Use my current location
      </Button>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <Input
          placeholder="Search a town, e.g. Ogbomoso"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="secondary">Go</Button>
      </form>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Popular towns
        </p>
        <div className="flex flex-wrap gap-2">
          {places.map((p) => (
            <Pill
              key={p.town}
              active={location?.town === p.town}
              onClick={() => {
                setLocation({ ...p })
                toast.success(`Location set to ${p.town}`)
                onClose()
              }}
            >
              {p.town}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium">Search radius</p>
          <span className="text-sm font-semibold text-primary">{radiusKm} km</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>
    </Sheet>
  )
}
