// SociaMart service worker — minimal app-shell + offline fallback.
const CACHE = 'sociamart-v1'
const SHELL = ['/', '/index.html', '/logo/logo-icon.svg', '/offline.html']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  // Network-first for navigations, falling back to the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }
  // Cache-first for same-origin static assets.
  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request)))
  }
})
