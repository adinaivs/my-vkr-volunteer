// Service Worker для ВолонтёрКР (PWA)
// Стратегии: navigation -> network-first с откатом в кэш и offline-страницу;
// статика (_next/static, иконки, картинки) -> stale-while-revalidate.

const VERSION = 'v1'
const STATIC_CACHE = `vkr-static-${VERSION}`
const PAGES_CACHE = `vkr-pages-${VERSION}`
const OFFLINE_URL = '/offline'

// Базовые (главные) страницы и ресурсы, доступные офлайн
const PRECACHE_URLS = [
  '/',
  '/login',
  '/register',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE)
      // addAll прерывается при любой ошибке, поэтому кэшируем по одному
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' })
            if (res.ok) await cache.put(url, res.clone())
          } catch {
            /* офлайн при установке — пропускаем */
          }
        })
      )
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Только GET и только http(s)
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // API и серверные данные не кэшируем
  if (url.pathname.startsWith('/api/')) return

  // Навигация по страницам: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(PAGES_CACHE)
          cache.put(request, fresh.clone())
          return fresh
        } catch {
          const cache = await caches.open(PAGES_CACHE)
          const cached = await cache.match(request)
          if (cached) return cached
          const offline = await cache.match(OFFLINE_URL)
          if (offline) return offline
          return new Response('Офлайн', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        }
      })()
    )
    return
  }

  // Статика и медиа: stale-while-revalidate
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE)
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => null)
        return cached || (await network) || new Response('', { status: 504 })
      })()
    )
  }
})
