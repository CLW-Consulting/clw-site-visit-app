// CLW Site Visit App — Service Worker
// ────────────────────────────────────────────────────────────────
// Purpose: keep the app shell (index.html) loading instantly even
// with zero signal (basements, remote sites, etc.), by serving a
// cached copy first and refreshing it quietly whenever a connection
// is available.
//
// This does NOT cache or interfere with:
//   - Google Drive sync calls (Apps Script) — always live network
//   - PDF.js CDN load (only used when uploading a PDF plan) — always live network
//   - Google Fonts — always live network
//   - IndexedDB visit/project/photo data — untouched, already local
//
// Bump CACHE_NAME any time you want to force every device onto a
// fresh cache (e.g. after a significant structural change to this
// file itself). Routine content updates to index.html do NOT need
// a version bump — the fetch handler below refreshes the cached
// copy automatically every time the app is opened with a connection.
const CACHE_NAME = 'clw-app-shell-v1';
const APP_SHELL = ['./', './index.html'];

// First install: pre-cache the app shell.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activation: clear out any old-named caches from previous versions.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
             .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Fetch handling:
// - Page loads (navigations): serve from cache instantly if available,
//   then fetch a fresh copy in the background and update the cache for
//   next time. If there's no cache yet and no connection, this fails
//   gracefully (nothing else can be done for a device's very first-ever
//   visit with no signal).
// - Everything else (fonts, PDF.js CDN, Apps Script sync calls): left
//   alone, untouched, always goes straight to the network as normal.
self.addEventListener('fetch', function (event) {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const network = fetch(event.request)
        .then(function (fresh) {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, fresh.clone());
          });
          return fresh;
        })
        .catch(function () {
          return cached || caches.match('./index.html');
        });

      return cached || network;
    })
  );
});
