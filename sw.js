/* 万象天账 · 离线册 */
'use strict';

const CACHE_NAME = 'wxtz-app-v1.43.0';
const SHELL = [
  './index.html',
  './site.webmanifest',
  './assets/style.css?v=178',
  './assets/fonts/lxgwwenkailite-regular.css',
  './assets/app.js?v=178',
  './data/core.js?v=178',
  './data/cities.js?v=178',
  './data/places.js?v=178',
  './data/beings.js?v=178',
  './data/timeline.js?v=178',
  './data/suiling.js?v=178',
  './data/organs.js?v=178',
  './data/arcs.js?v=178',
  './data/docs.js?v=178',
  './data/lexicon.js?v=178',
  './data/sayings.js?v=178',
  './data/goods.js?v=178',
  './data/stakes.js?v=178',
  './data/stories.js?v=178',
  './data/characters.js?v=178',
  './data/relations.js?v=178',
  './data/updates.js?v=178',
  './data/trials.js?v=178',
  './data/granaries.js?v=178',
  './data/relay.js?v=178',
  './data/daily.js?v=178',
  './data/observatory.js?v=178',
  './data/artifacts.js?v=178',
  './assets/ledger-atmosphere.webp',
  './assets/ledger-cover.jpg',
  './assets/places/ash-corridor.webp',
  './assets/places/cancellation-pit.webp',
  './assets/places/debtless-sea.webp',
  './assets/places/heavenly-ledger-court.webp',
  './assets/places/copytower-interior.webp',
  './assets/places/central-ledger-thirteenth-floor.webp',
  './assets/places/hanging-sun-tower-interior.webp',
  './assets/places/golden-gutter-binding-line.webp',
  './assets/places/ashen-corridor-outpost.webp',
  './assets/places/nether-capital-ticket-vault.webp',
  './assets/three-seal-observatory.webp',
  './assets/cities/zhao.webp',
  './assets/cities/yan.webp',
  './assets/cities/chi.webp',
  './assets/cities/xuan.webp',
  './assets/cities/lan.webp',
  './assets/cities/zhong.webp',
  './assets/cities/shu.webp',
  './assets/cities/xiu.webp',
  './assets/cities/bai.webp',
  './assets/cities/ming.webp',
  './assets/cities/wen.webp',
  './assets/cities/ye.webp',
  './assets/cities/wuzi.webp',
  './assets/artifacts/missing-page-binder.webp',
  './assets/artifacts/four-pillar-tray.webp',
  './assets/artifacts/map-square-ruler.webp',
  './assets/artifacts/sealed-tide-letter.webp',
  './assets/artifacts/neighborhood-grain-measure.webp',
  './assets/artifacts/three-witness-slip.webp',
  './assets/artifacts/fog-boundary-stake.webp',
  './assets/artifacts/day-storage-box.webp',
  './assets/artifacts/returned-ticket-vault.webp',
  './assets/artifacts/ash-corridor-needle.webp',
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
  './assets/portraits/wenren-heng.webp',
  './assets/portraits/gu-cun.webp',
  './assets/portraits/su-mo.webp',
  './assets/portraits/tuo-qingzhi.webp',
  './assets/portraits/wu-zhongren.webp',
  './assets/portraits/xiao-lushi.webp',
  './assets/portraits/xu-liubai.webp',
  './assets/portraits/xue-housheng.webp',
  './assets/portraits/cheng-yicha.webp',
  './assets/portraits/zheng-wu.webp',
  './assets/portraits/bai-wenjin.webp',
  './assets/portraits/kong-guolao.webp',
  './assets/portraits/jia-sifang.webp',
  './assets/portraits/sha-jingyi.webp',
  './assets/portraits/li-yuanbu.webp',
  './assets/portraits/chen-xuan.webp',
  './assets/portraits/lu-qingjian.webp',
  './assets/portraits/lao-piaoli.webp'
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
