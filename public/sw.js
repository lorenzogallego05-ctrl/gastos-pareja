// Service worker mínimo: solo cachea el "app shell" (assets estáticos e
// íconos) para que la PWA cargue rápido y quede instalable. Los datos
// (Supabase) nunca pasan por acá: siempre van directo a la red para que
// la app muestre información actualizada.

const CACHE_NAME = "gastos-pareja-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function esEstaticoCacheable(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/"))
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (!esEstaticoCacheable(url)) return; // todo lo demás va directo a la red

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cacheado = await cache.match(req);
      if (cacheado) return cacheado;
      const respuesta = await fetch(req);
      if (respuesta.ok) cache.put(req, respuesta.clone());
      return respuesta;
    })
  );
});
