// IdexQR® PWA – Offline Magic (safe + predictable)
const VERSION = "v1"; // bump to v2, v3 when you want to force-refresh caches
const CACHE_NAME = `idexqr-racecard-${VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./home.html",
  "./ask.html",
  "./legends.html",
  "./manifest.json",
  "./offline.html",

  // data
  "./gatecard.csv",
  "./legends.csv",

  // icons (adjust filenames if yours differ)
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("idexqr-racecard-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Strategy:
// - HTML navigation: cache-first with offline fallback page
// - CSV + same-origin assets: stale-while-revalidate (fast, keeps updated when online)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isHTMLNav =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTMLNav) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return cache.match("./offline.html");
        }
      })()
    );
    return;
  }

  // CSV & other assets
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);

      const fetchAndUpdate = fetch(req)
        .then((fresh) => {
          cache.put(req, fresh.clone());
          return fresh;
        })
        .catch(() => cached);

      // Serve cached immediately if present, update in background
      return cached || fetchAndUpdate;
    })()
  );
});
