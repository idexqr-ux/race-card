self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// For now: network-first pass-through (no caching yet)
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
