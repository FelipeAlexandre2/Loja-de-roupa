const CACHE_NAME = 'ttstore-v2';

// ── Install: pula espera imediatamente ──────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
});

// ── Activate: limpa TODOS os caches antigos ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Network-First para tudo em desenvolvimento ─────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API ou requisições de página → sempre busca direto na rede sem cache
  if (url.pathname.startsWith('/api/') || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Tenta rede primeiro
  event.respondWith(
    fetch(event.request)
      .then(response => response)
      .catch(() => caches.match(event.request))
  );
});
