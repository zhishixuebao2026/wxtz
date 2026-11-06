/* 万象天账 · 离线册 */
'use strict';

const CACHE_NAME = 'wxtz-app-v1.53.0';
const SHELL = [
  './index.html',
  './site.webmanifest',
  './assets/style.css?v=188',
  './assets/fonts/lxgwwenkailite-regular.css',
  './assets/app.js?v=188',
  './data/core.js?v=188',
  './data/cities.js?v=188',
  './data/places.js?v=188',
  './data/roads.js?v=188',
  './data/beings.js?v=188',
  './data/timeline.js?v=188',
  './data/suiling.js?v=188',
  './data/organs.js?v=188',
  './data/arcs.js?v=188',
  './data/docs.js?v=188',
  './data/lexicon.js?v=188',
  './data/sayings.js?v=188',
  './data/goods.js?v=188',
  './data/stakes.js?v=188',
  './data/stories.js?v=188',
  './data/characters.js?v=188',
  './data/relations.js?v=188',
  './data/updates.js?v=188',
  './data/trials.js?v=188',
  './data/granaries.js?v=188',
  './data/relay.js?v=188',
  './data/daily.js?v=188',
  './data/observatory.js?v=188',
  './data/artifacts.js?v=188',
  './assets/routes/bridge-upper.webp',
  './assets/routes/bridge-middle.webp',
  './assets/routes/bridge-lower.webp',
  './assets/routes/history-grain-road.webp',
  './assets/routes/iron-canal-road.webp',
  './assets/routes/law-water-road.webp',
  './assets/routes/north-register-road.webp',
  './assets/routes/medicine-end-road.webp',
  './assets/routes/wild-history-road.webp',
  './assets/routes/west-spine-road.webp',
  './assets/ledger-atmosphere.webp',
  './assets/ledger-cover.jpg',
  './assets/goods/dingmo.webp',
  './assets/goods/zhaozhi.webp',
  './assets/goods/ribiao.webp',
  './assets/goods/cangtie.webp',
  './assets/goods/wuseshu.webp',
  './assets/goods/chijin.webp',
  './assets/goods/zhangzhonglu.webp',
  './assets/goods/jiming-tie.webp',
  './assets/goods/xingpan.webp',
  './assets/goods/shuiyin.webp',
  './assets/stories/01-hook-needle.webp',
  './assets/stories/08-slow-clock.webp',
  './assets/stories/15-missing-page.webp',
  './assets/stories/25-willing-watch.webp',
  './assets/stories/33-leave-open.webp',
  './assets/stories/52-golden-gutter.webp',
  './assets/stories/06-waterfront-market.webp',
  './assets/stories/80-copytower.webp',
  './assets/stories/93-empty-grid.webp',
  './assets/stories/100-same-name.webp',
  './assets/stories/22-extinguished-lamp.webp',
  './assets/stories/34-foot-fare.webp',
  './assets/stories/48-old-resident.webp',
  './assets/stories/54-ink-order-office.webp',
  './assets/stories/64-early-money.webp',
  './assets/stories/70-first-stake.webp',
  './assets/stories/74-new-ledger.webp',
  './assets/stories/02-night-bell.webp',
  './assets/stories/03-floating-ledgers.webp',
  './assets/stories/05-hanging-grace.webp',
  './assets/stories/09-funeral-columns.webp',
  './assets/stories/11-hearth-paper.webp',
  './assets/stories/17-copytower-pages.webp',
  './assets/stories/21-returned-daylight.webp',
  './assets/stories/24-unnamed-field.webp',
  './assets/stories/39-river-measure.webp',
  './assets/stories/47-shallow-mark.webp',
  './assets/beings/01-grey-clerk.webp',
  './assets/beings/02-plain-mender.webp',
  './assets/beings/03-balance-cultivator.webp',
  './assets/beings/04-inkmarked-citizen.webp',
  './assets/beings/05-seal-spirit.webp',
  './assets/beings/06-white-remnant.webp',
  './assets/beings/07-between-periods.webp',
  './assets/beings/08-altered-record.webp',
  './assets/beings/09-night-eraser.webp',
  './assets/beings/10-boundary-post-spirit.webp',
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
  './assets/places/zhao-clock-room.webp',
  './assets/places/yan-maproom.webp',
  './assets/places/chi-quench-archive.webp',
  './assets/places/lan-ticket-house.webp',
  './assets/places/zhong-bell-gallery.webp',
  './assets/places/shu-council-corridor.webp',
  './assets/places/xiu-needle-stack.webp',
  './assets/places/bai-day-vault.webp',
  './assets/places/ming-soil-workshop.webp',
  './assets/places/ye-stakehall.webp',
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
  './assets/portraits/pei-chizhun.webp',
  './assets/portraits/sang-zhaowen.webp',
  './assets/portraits/luo-zhaoqiu.webp',
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
