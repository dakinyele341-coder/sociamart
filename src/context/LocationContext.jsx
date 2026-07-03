import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

const LocationContext = createContext(null)

const STORAGE_KEY = 'sociamart.location'

/** A tiny mock geocoder: maps a few known Nigerian towns to coordinates.
 *  Swap for a real geocoding provider (OpenStreetMap/Nominatim, Mapbox) later. */
export const NG_PLACES = [
  { town: 'Ogbomoso', state: 'Oyo State', lat: 8.1333, lon: 4.25 },
  { town: 'Ibadan', state: 'Oyo State', lat: 7.3775, lon: 3.947 },
  { town: 'Lagos', state: 'Lagos State', lat: 6.5244, lon: 3.3792 },
  { town: 'Abuja', state: 'FCT', lat: 9.0765, lon: 7.3986 },
  { town: 'Kano', state: 'Kano State', lat: 12.0022, lon: 8.592 },
  { town: 'Port Harcourt', state: 'Rivers State', lat: 4.8156, lon: 7.0498 },
  { town: 'Benin City', state: 'Edo State', lat: 6.3382, lon: 5.6258 },
  { town: 'Ilorin', state: 'Kwara State', lat: 8.4966, lon: 4.5421 },
  { town: 'Enugu', state: 'Enugu State', lat: 6.4499, lon: 7.5006 },
  { town: 'Abeokuta', state: 'Ogun State', lat: 7.1557, lon: 3.3451 },
]

export function geocodePlace(query) {
  if (!query) return null
  const q = query.toLowerCase()
  return (
    NG_PLACES.find((p) => p.town.toLowerCase() === q) ||
    NG_PLACES.find((p) => `${p.town}, ${p.state}`.toLowerCase().includes(q)) ||
    NG_PLACES.find((p) => p.town.toLowerCase().includes(q)) ||
    null
  )
}

/** Nearest known place to a coordinate (used for reverse-geocoding GPS). */
export function nearestPlace(lat, lon) {
  let best = null
  let bestDist = Infinity
  for (const p of NG_PLACES) {
    const d = haversine(lat, lon, p.lat, p.lon)
    if (d < bestDist) {
      bestDist = d
      best = p
    }
  }
  return best
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [radiusKm, setRadiusKm] = useState(25)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    if (location) localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
  }, [location])

  /** Use browser GPS, then reverse-map to the nearest known town. */
  const detectLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setDetecting(false)
        resolve(null)
        return
      }
      setDetecting(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          const place = nearestPlace(latitude, longitude)
          const next = {
            lat: latitude,
            lon: longitude,
            town: place?.town ?? 'Your area',
            state: place?.state ?? '',
          }
          setLocation(next)
          setDetecting(false)
          resolve(next)
        },
        () => {
          setDetecting(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }, [])

  /** Set location from a typed place name via the mock geocoder. */
  const setPlaceByName = useCallback((query) => {
    const place = geocodePlace(query)
    if (place) setLocation({ ...place })
    return place
  }, [])

  const value = useMemo(
    () => ({
      location,
      radiusKm,
      radiusMeters: radiusKm * 1000,
      detecting,
      hasLocation: Boolean(location),
      setLocation,
      setRadiusKm,
      detectLocation,
      setPlaceByName,
      places: NG_PLACES,
    }),
    [location, radiusKm, detecting, detectLocation, setPlaceByName]
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within a LocationProvider')
  return ctx
}
