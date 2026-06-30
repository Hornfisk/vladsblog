// Minimal service worker — its only job is to make vlads.blog an installable PWA
// (Chromium requires a registered SW with a fetch handler to fire beforeinstallprompt
// and to use the manifest icons for "Add to Home Screen").
//
// IMPORTANT: this intentionally does NOT cache anything. The fetch handler is a no-op
// passthrough, so every request goes straight to the network and content never goes
// stale. If you later want offline support, add a caching strategy deliberately.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  /* no-op: let the browser handle the request normally (no caching) */
});
