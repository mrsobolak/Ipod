/**
 * sw.js — Service worker: caches the app shell so the iPod boots and works
 * with zero connectivity once installed to the home screen. Your imported
 * music lives in IndexedDB (not here), so library size never bloats this cache.
 *
 * Bump CACHE_NAME whenever you change any cached file, or iOS Safari will
 * keep serving the stale version from cache.
 */

const CACHE_NAME = 'ipod-shell-v3';

const SHELL_FILES = [
    './',
    './index.html',
    './manifest.json',
    './css/global.css',
    './css/ipod.css',
    './css/screen.css',
    './css/menu.css',
    './css/now-playing.css',
    './js/main.js',
    './js/dom.js',
    './js/config.js',
    './js/ui.js',
    './js/controls.js',
    './js/player.js',
    './js/musicdb.js',
    './js/id3.js',
    './js/import.js',
    './js/zoomPrevention.js',
    './js/components/IpodDesign.js',
    './js/library.json',
    './public/icons/icon-180.png',
    './public/icons/icon-192.png',
    './public/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(
                SHELL_FILES.map((url) =>
                    cache.add(url).catch((err) => console.warn('SW cache skip:', url, err))
                )
            )
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Cache-first for the app shell; network fallback for anything unrecognized
// (e.g. Google Fonts on first load — after that, font requests just fail
// silently offline and the fallback font kicks in, which is fine).
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).catch(() => cached);
        })
    );
});
