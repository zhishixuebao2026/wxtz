/* 万象天账 · 离线册 */
'use strict';

const CACHE_NAME = 'wxtz-app-v1.29.0';
const SHELL = [
  './index.html',
  './site.webmanifest',
  './assets/style.css?v=163',
  './assets/fonts/lxgwwenkailite-regular.css',
  './assets/app.js?v=163',
  './data/core.js?v=163',
  './data/cities.js?v=163',
  './data/beings.js?v=163',
  './data/timeline.js?v=163',
  './data/suiling.js?v=163',
  './data/organs.js?v=163',
  './data/arcs.js?v=163',
  './data/docs.js?v=163',
  './data/lexicon.js?v=163',
  './data/sayings.js?v=163',
  './data/goods.js?v=163',
  './data/stakes.js?v=163',
  './data/stories.js?v=163',
  './data/characters.js?v=163',
  './data/relations.js?v=163',
  './data/updates.js?v=163',
  './data/trials.js?v=163',
  './data/granaries.js?v=163',
  './data/relay.js?v=163',
  './assets/ledger-atmosphere.webp',
  './assets/icons/app-192.png',
  './assets/icons/app-512.png',
  './assets/icons/app-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/portraits/bai-xihe.webp',
  './assets/portraits/hong-sigu.webp',
  './assets/portraits/jiang-keqing.webp',
  './assets/portraits/liang-zhaohe.webp',
  './assets/portraits/mei-busao.webp',
  './assets/portraits/mi-shouchang.webp',
  './assets/portraits/qiao-zhongren.webp',
  './assets/portraits/su-jiuting.webp',
  './assets/portraits/tie-wuming.webp',
  './assets/portraits/wenren-heng.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    await cache.addAll(SHELL);
    const fontCssUrl = new URL('./assets/fonts/lxgwwenkailite-regular.css', self.registration.scope);
    const fontCss = await cache.match(fontCssUrl);
    if (fontCss) {
      const css = await fontCss.text();
      const fonts = Array.from(css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g))
        .map(match => new URL(match[2], fontCssUrl).href)
        .filter(url => new URL(url).origin === self.location.origin);
      for (let i = 0; i < fonts.length; i += 16) await cache.addAll(fonts.slice(i, i + 16));
    }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('wxtz-app-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!new URL(request.url).pathname.startsWith(scope.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        return await cache.match(request) || await cache.match(new URL('index.html', scope).href) || await cache.match(new URL('./', scope).href);
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  })());
});
