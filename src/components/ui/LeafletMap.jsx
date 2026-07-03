import { useEffect, useRef } from 'react'

// Load Leaflet from CDN once (avoids Vite's marker-asset packaging pitfalls).
let leafletPromise
function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.L) return Promise.resolve(window.L)
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => resolve(window.L)
    script.onerror = reject
    document.head.appendChild(script)
  })
  return leafletPromise
}

const DEFAULT = { lat: 9.0765, lon: 7.3986 } // Abuja fallback

/**
 * Small OpenStreetMap view with a single draggable pin.
 * Calls onChange(lat, lon) when the pin is dragged or the map is tapped.
 */
export default function LeafletMap({ lat, lon, onChange, height = 200, interactive = true }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    let active = true
    loadLeaflet()
      .then((L) => {
        if (!active || !L || !elRef.current || mapRef.current) return
        const start = [lat ?? DEFAULT.lat, lon ?? DEFAULT.lon]
        const map = L.map(elRef.current, { zoomControl: false, attributionControl: false }).setView(start, 13)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

        const icon = L.divIcon({
          className: 'sm-pin',
          html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#FF5722;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 22],
        })
        const marker = L.marker(start, { draggable: interactive, icon }).addTo(map)
        marker.on('dragend', () => {
          const p = marker.getLatLng()
          onChangeRef.current?.(p.lat, p.lng)
        })
        if (interactive) {
          map.on('click', (e) => {
            marker.setLatLng(e.latlng)
            onChangeRef.current?.(e.latlng.lat, e.latlng.lng)
          })
        }
        mapRef.current = map
        markerRef.current = marker
        // Map sometimes needs a nudge to render tiles inside flex/animated containers.
        setTimeout(() => map.invalidateSize(), 150)
      })
      .catch(() => {})
    return () => {
      active = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect external lat/lon changes (e.g. "use my location" / town pick).
  useEffect(() => {
    if (mapRef.current && markerRef.current && lat != null && lon != null) {
      markerRef.current.setLatLng([lat, lon])
      mapRef.current.setView([lat, lon])
    }
  }, [lat, lon])

  return <div ref={elRef} style={{ height }} className="w-full overflow-hidden rounded-xl bg-navy/5" />
}
