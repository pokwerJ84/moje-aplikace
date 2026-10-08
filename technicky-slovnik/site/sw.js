const VERSION = "v17";
const CACHE = `technical-dictionary-${VERSION}`;
const OWN_CACHE_PREFIX = "technical-dictionary-";
const CORE = ["./", "./index.html", "./styles.css", "./app.js", "./manuals.js", "./updater.js", "./icon.svg", "./theme.js", "./dark.css", "./apple-touch-icon-v10.png", "./icon-192-v10.png", "./icon-512-v10.png", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map(async asset => {
      const response = await fetch(asset, { cache: "reload" });
      if (response.ok) await cache.put(asset, response.clone());
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(OWN_CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function navigationNetworkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const freshUrl = new URL(request.url);
    freshUrl.searchParams.set("__app_refresh", String(Date.now()));
    const response = await fetch(freshUrl, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "text/html" }
    });
    if (response.ok) await cache.put("./index.html", response.clone());
    return response;
  } catch (error) {
    return (await cache.match("./index.html")) || (await cache.match("./"));
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }
  event.respondWith(networkFirst(request));
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
});

