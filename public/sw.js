// Puente · caché mínima de la interfaz para permitir la instalación como aplicación.
// Los envíos y los archivos siguen viniendo siempre de Cloudflare.

const NOMBRE_CACHÉ = 'puente-interfaz-v1'
const ARCHIVOS_INICIALES = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(NOMBRE_CACHÉ)
      .then((caché) => caché.addAll(ARCHIVOS_INICIALES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves
            .filter((clave) => clave !== NOMBRE_CACHÉ)
            .map((clave) => caches.delete(clave)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)

  // La API nunca se guarda en caché: contiene datos privados de la sesión.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  evento.respondWith(
    fetch(request)
      .then((respuesta) => {
        if (
          respuesta.ok &&
          (url.pathname === '/' ||
            url.pathname === '/index.html' ||
            url.pathname.startsWith('/assets/'))
        ) {
          const copia = respuesta.clone()
          void caches.open(NOMBRE_CACHÉ).then((caché) => caché.put(request, copia))
        }
        return respuesta
      })
      .catch(async () => {
        const guardada = await caches.match(request)
        return guardada ?? (await caches.match('/index.html')) ?? Response.error()
      }),
  )
})
