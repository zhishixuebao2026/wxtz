/* ============================================================
   万象天账 · 互动逻辑
   导航 / 摊开账册天地图 / 境界阶条 / 人物门类筛选 / 词库检索 / 流水簿
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined && html !== null) n.innerHTML = html;
    return n;
  };
  var txt = function (node, s) { node.textContent = s; return node; };
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var elNS = function (tag, ns) {
    return document.createElementNS(ns, tag);
  };

  var PAGES = ['home', 'map', 'power', 'trial', 'beings', 'characters', 'network', 'timeline', 'suiling', 'lexicon', 'shiju', 'find', 'goods', 'stakes', 'organs', 'docs', 'stories', 'updates'];

  /* 跨页桥：人物志显式点「看关系网」后聚焦对应节点 */
  var PAGE_HOOKS = {};

  /* ---------------- 导航、返回与阅读记忆 ---------------- */
  var CUR = 'home';
  var SCROLLS = {};
  var READER_KEY = 'wxtz_reader_v1';
  var LAST_READING = null;
  var CHAR_FILTER = '全部';
  var NAV_INDEX = 0;
  try {
    var cached = JSON.parse(localStorage.getItem(READER_KEY) || 'null');
    if (cached && PAGES.indexOf(cached.page) >= 0) {
      LAST_READING = cached;
      if (cached.scrolls && typeof cached.scrolls === 'object') SCROLLS = cached.scrolls;
      if (typeof cached.characterFilter === 'string') CHAR_FILTER = cached.characterFilter;
    }
  } catch (e) {}
  try {
    if (history.state && history.state.wxReader) NAV_INDEX = Number(history.state.index) || 0;
    else if (history.replaceState) history.replaceState({ wxReader: true, page: location.hash.slice(1) || 'home', index: 0, scroll: 0 }, '', location.href);
  } catch (e) {}

  function pageLabel(id) {
    var b = document.querySelector('#nav button[data-goto="' + id + '"]');
    return b ? b.textContent.trim() : '总纲';
  }
  var mobilePageSelect = $('#mobilePageSelect');
  if (mobilePageSelect) {
    PAGES.forEach(function (id) {
      var option = document.createElement('option'); option.value = id; option.textContent = pageLabel(id);
      mobilePageSelect.appendChild(option);
    });
    mobilePageSelect.addEventListener('change', function () { show(mobilePageSelect.value); });
  }
  function readY() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
  function scrollRatio() {
    var root = document.documentElement, span = root.scrollHeight - root.clientHeight;
    return span > 0 ? Math.max(0, Math.min(1, readY() / span)) : 0;
  }
  function updateReaderUI(ratio) {
    ratio = ratio == null ? scrollRatio() : ratio;
    var pos = $('#readerPosition'), pct = $('#readerPercent'), fill = $('#readerTrackFill'), resume = $('#readerContinue');
    if (pos) txt(pos, '正在读 · ' + pageLabel(CUR));
    if (pct) txt(pct, Math.round(ratio * 100) + '%');
    if (fill) fill.style.width = (ratio * 100).toFixed(1) + '%';
    if (resume) {
      resume.disabled = !LAST_READING;
      resume.title = LAST_READING ? '续读：' + pageLabel(LAST_READING.page) + ' · ' + Math.round((LAST_READING.ratio || 0) * 100) + '%' : '读过一段后，此处会记下续读位置';
    }
  }
  function persistReading() {
    var y = readY();
    SCROLLS[CUR] = y;
    var root = document.documentElement, span = root.scrollHeight - root.clientHeight;
    var record = { page: CUR, scroll: y, scrolls: SCROLLS, ratio: span > 0 ? Math.max(0, Math.min(1, y / span)) : 0, characterFilter: CHAR_FILTER, savedAt: Date.now() };
    LAST_READING = record;
    try { localStorage.setItem(READER_KEY, JSON.stringify(record)); } catch (e) {}
    updateReaderUI(record.ratio);
  }
  function show(id, noPush, restoreScroll) {
    if (PAGES.indexOf(id) < 0) id = 'home';
    if (LAZY[id]) { var f0 = LAZY[id]; delete LAZY[id]; f0(); }
    if (id === CUR && restoreScroll == null) return;
    var currentY = readY();
    SCROLLS[CUR] = currentY;
    if (id !== CUR) persistReading();
    $$('.page').forEach(function (p) { p.classList.remove('on'); });
    var pg = $('#pg-' + id);
    if (pg) pg.classList.add('on');
    $$('#nav button[data-goto]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-goto') === id);
    });
    CUR = id;
    if (mobilePageSelect) mobilePageSelect.value = id;
    var nb = document.querySelector('#nav button[data-goto="' + id + '"]');
    document.title = (nb ? nb.textContent + ' · ' : '') + '万象天账 · 墨序司异闻籍';
    if (noPush) {
      if (history.replaceState) {
        var state = history.state && history.state.wxReader ? history.state : { wxReader: true, index: NAV_INDEX };
        NAV_INDEX = Number(state.index) || 0;
        history.replaceState({ wxReader: true, page: id, index: NAV_INDEX, scroll: restoreScroll == null ? (SCROLLS[id] || 0) : restoreScroll }, '', '#' + id);
      } else location.hash = id;
    } else if (history.pushState) {
      if (history.state && history.state.wxReader) history.replaceState(Object.assign({}, history.state, { scroll: currentY }), '', location.href);
      NAV_INDEX = (history.state && history.state.wxReader ? Number(history.state.index) || 0 : NAV_INDEX) + 1;
      history.pushState({ wxReader: true, page: id, index: NAV_INDEX, scroll: 0 }, '', '#' + id);
    } else location.hash = id;
    var targetY = restoreScroll == null ? (SCROLLS[id] || 0) : restoreScroll;
    SCROLLS[id] = targetY;
    if (restoreScroll != null) {
      var priorBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, targetY);
      document.documentElement.style.scrollBehavior = priorBehavior;
    } else window.scrollTo(0, targetY);
    persistReading();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-goto]') : null;
    if (t) show(t.getAttribute('data-goto'));
  });
  var backButton = $('#readerBack');
  if (backButton) backButton.addEventListener('click', function () {
    if (history.state && history.state.wxReader && Number(history.state.index) > 0) history.back();
    else if (CUR !== 'home') show('home', true, SCROLLS.home || 0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  var continueButton = $('#readerContinue');
  if (continueButton) continueButton.addEventListener('click', function () {
    if (!LAST_READING || PAGES.indexOf(LAST_READING.page) < 0) return;
    show(LAST_READING.page, true, Number(LAST_READING.scroll) || 0);
  });
  window.addEventListener('hashchange', function () {
    if (history.state && history.state.wxReader) return;
    show(location.hash.slice(1) || 'home', true);
  });
  window.addEventListener('popstate', function (e) {
    var state = e.state;
    var target = state && state.wxReader ? state.page : (location.hash.slice(1) || 'home');
    show(target, true, state && state.wxReader ? Number(state.scroll) || 0 : undefined);
  });
  /* 五本重书首入才开建；正文进度另存本机，续读不依赖网络。 */
  var LAZY = {};
  LAZY.lexicon = buildLexicon;
  LAZY.stories = buildStories;
  LAZY.shiju = buildShiju;
  LAZY.characters = buildCharacters;
  LAZY.updates = buildUpdates;
  var __prog = el('div', 'prog');
  document.body.insertBefore(__prog, document.body.firstChild);
  (function () {
    var timer = 0;
    function onScroll() {
      var p = scrollRatio();
      __prog.style.width = (p * 100).toFixed(1) + '%';
      updateReaderUI(p);
      if (timer) clearTimeout(timer);
      timer = setTimeout(persistReading, 320);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    var initial = scrollRatio();
    __prog.style.width = (initial * 100).toFixed(1) + '%';
    updateReaderUI(initial);
  })();
  window.addEventListener('pagehide', persistReading);

  /* 「/」任意页直达全书索引；顶栏勾稽进度线 */
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      show('find');
      setTimeout(function () { var inp = $('#findSearch'); if (inp) inp.focus(); }, 160);
    }
  });
  /* ---------------- 总纲 ---------------- */
  function buildHome() {
    txt($('#homeMotto'), WXCORE.motto);
    var pre = $('#homePre');
    pre.innerHTML = '';
    WXCORE.preamble.forEach(function (line, i) {
      var p = el('p');
      if (i === 0 || i === WXCORE.preamble.length - 1) p.className = 'strong';
      txt(p, line);
      pre.appendChild(p);
    });

    var laws = $('#laws');
    laws.innerHTML = '';
    WXCORE.laws.forEach(function (L) {
      var card = el('article', 'law');
      var top = el('div', 'law-top');
      top.appendChild(txt(el('span', 'law-no'), L.no));
      top.appendChild(txt(el('h4'), L.name));
      top.appendChild(txt(el('span', 'law-also'), L.also));
      card.appendChild(top);
      card.appendChild(txt(el('p', 'law-text'), L.text));
      card.appendChild(txt(el('p', 'law-prov'), '账房谚　' + L.proverb));
      laws.appendChild(card);
    });

    var mx = $('#moxu');
    mx.innerHTML = '';
    mx.appendChild(txt(el('p', 'mx-head'), WXCORE.moxu.head));
    WXCORE.moxu.layers.forEach(function (ly) {
      var row = el('div', 'mx-layer');
      row.appendChild(txt(el('span', 'mx-key'), ly.key));
      row.appendChild(txt(el('span', 'mx-name'), ly.name));
      var st = el('span', 'mx-status');
      st.setAttribute('data-s', ly.status);
      txt(st, ly.status);
      row.appendChild(st);
      row.appendChild(txt(el('p', 'mx-text'), ly.text));
      mx.appendChild(row);
    });

    if (typeof WXFOUR !== 'undefined') {
      var hf = el('div', 'home-four');
      hf.appendChild(txt(el('h4'), '四柱 · ' + WXFOUR.formula));
      var ul = el('div', 'hf-row');
      WXFOUR.pillars.forEach(function (p) {
        var c = el('div', 'hf-cell');
        c.appendChild(txt(el('span', 'hf-name'), p.name));
        c.appendChild(txt(el('span', 'hf-en'), p.en));
        ul.appendChild(c);
      });
      hf.appendChild(ul);
      hf.appendChild(txt(el('p', 'hf-life'), WXFOUR.life));
      $('#pg-home').appendChild(hf);
    }

    /* 新纸（首页最新卷）：每成一卷，首页自己会说话 */
    var ns = $('#newestStory');
    if (ns && typeof WXSTORIES !== 'undefined' && WXSTORIES.length) {
      var last = WXSTORIES[WXSTORIES.length - 1];
      ns.hidden = false;
      ns.innerHTML = '';
      ns.appendChild(txt(el('span', 'ns-k'), '新纸 · ' + last.no));
      ns.appendChild(txt(el('strong', 'ns-t'), last.title));
      ns.appendChild(txt(el('span', 'ns-s'), last.sub));
      var nb = el('button', 'chip');
      txt(nb, '开卷 ↗');
      nb.addEventListener('click', function () { volGo(last.no); });
      ns.appendChild(nb);
    }

    /* 全书总账：首页自己盘自己的家底 */
    var ht = $('#homeTally');
    if (ht) {
      var parts = [];
      if (typeof WXSTORIES !== 'undefined') parts.push('异闻 ' + WXSTORIES.length + ' 卷');
      if (typeof WXCHARS !== 'undefined') parts.push('人物 ' + WXCHARS.length);
      if (typeof WXLEXICON !== 'undefined') parts.push('词库 ' + WXLEXICON.length);
      if (typeof WXSAYINGS !== 'undefined') parts.push('谚 ' + (WXSAYINGS.length + (typeof WXCITYSAYINGS !== 'undefined' ? WXCITYSAYINGS.length : 0)) + ' 句');
      if (typeof WXGOODS !== 'undefined') parts.push('货殖 ' + WXGOODS.length + ' 物');
      if (typeof WXSTAKES !== 'undefined') parts.push('界桩 ' + WXSTAKES.length + ' 根');
      if (typeof WXORGANS !== 'undefined') parts.push('公门 ' + WXORGANS.length + ' 署');
      if (typeof WXARCS !== 'undefined') parts.push('卷线 ' + WXARCS.length + ' 条');
      if (typeof WXDOCS !== 'undefined') parts.push('故纸 ' + WXDOCS.length + ' 件');
      if (typeof WXBEINGS !== 'undefined') parts.push('众生 ' + WXBEINGS.length + ' 众');
      if (typeof WXSUILING !== 'undefined') parts.push('岁令 ' + WXSUILING.months.length + ' 令');
      if (typeof WXUPDATES !== 'undefined') parts.push('更新志 ' + WXUPDATES.length);
      if (typeof WXTRIALS !== 'undefined') parts.push('试账 ' + WXTRIALS.length + ' 案');
      if (typeof WXGRANARIES !== 'undefined') parts.push('仓衡 ' + WXGRANARIES.stores.length + ' 制');
      txt(ht, '全书总账：' + parts.join(' · '));
      /* v1.20.0 我架入口：总账行尾立门，收藏的卷回家即见；计数随星而新 */
      var fchip = el('button', 'chip');
      txt(fchip, '我架 · ' + favCountNow() + ' 卷');
      fchip.setAttribute('title', '点开我架——只看收过的卷');
      fchip.addEventListener('click', function () {
        WX_FAV_ONLY = true;
        if (!LAZY.stories) STORY_RENDER();
        favLabelRefresh();
        show('stories');
      });
      ht.appendChild(document.createTextNode(' · '));
      ht.appendChild(fchip);
    }

    /* 今日一句：账房谚按日取一句，点之入拾句 */
    var td = $('#todayLine');
    if (td && typeof WXSAYINGS !== 'undefined' && WXSAYINGS.length) {
      var d0 = new Date();
      var doy = Math.floor((d0 - new Date(d0.getFullYear(), 0, 0)) / 86400000);
      var today = WXSAYINGS[(d0.getFullYear() * 1000 + doy) % WXSAYINGS.length];
      td.innerHTML = '';
      td.appendChild(txt(el('span', 'tl-k'), '今日一句'));
      var tq = el('button', 'tl-q');
      txt(tq, '「' + today + '」');
      tq.setAttribute('title', '点之至拾句页');
      tq.addEventListener('click', function () { show('shiju'); });
      td.appendChild(tq);
    }

    /* 十三京星带：题签一点直达天地图与京卷宗 */
    var strip = $('#cityStrip');
    if (strip) {
      strip.innerHTML = '';
      WXCITIES.forEach(function (c) {
        var b = el('button', 'cs-item' + (c.blank ? ' blank' : ''));
        var nu = el('span', 'cs-nu');
        txt(nu, WX_CITY_NUM[c.nu - 1]);
        b.appendChild(nu);
        b.appendChild(document.createTextNode(c.name));
        b.addEventListener('click', function () { show('map'); openCity(c.id); });
        strip.appendChild(b);
      });
    }
  }

  /* ---------------- 天地图 ---------------- */
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') { n.textContent = attrs[k]; }
        else if (k === 'style') { n.setAttribute('style', attrs[k]); }
        else { n.setAttribute(k, attrs[k]); }
      });
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function setAttrs(n, o) { for (var k in o) { if (o.hasOwnProperty(k)) n.setAttribute(k, o[k]); } return n; }
  var CN_DIG = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function cnNum(n) {
    var b = Math.floor(n / 100) % 10, h = Math.floor(n / 10) % 10, o = n % 10;
    var s = (b ? CN_DIG[b] + '百' : '') + (h ? CN_DIG[h] + '十' : '') + (o ? CN_DIG[o] : '');
    return s.indexOf('一十') === 0 ? s.slice(1) : s;
  }
  function qPath(a, b, r) {
    var ax = a.pos[0], ay = a.pos[1], bx = b.pos[0], by = b.pos[1];
    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var cx = mx - (dy / len) * r, cy = my + (dx / len) * r;
    return { cx: cx, cy: cy, d: 'M' + ax + ',' + ay + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + bx + ',' + by };
  }
  var cityById = {};
  /* ---------------- 图卷走看：滚轮缩放 / 拖拽平移 / 双击复位 ---------------- */
  function attachPanZoom(svg, W, H) {
    if (!svg) return;
    var vb = { x: 0, y: 0, w: W, h: H };
    function apply() { svg.setAttribute('viewBox', vb.x.toFixed(1) + ' ' + vb.y.toFixed(1) + ' ' + vb.w.toFixed(1) + ' ' + vb.h.toFixed(1)); }
    function clamp() {
      vb.w = Math.max(W / 5, Math.min(W, vb.w));
      vb.h = vb.w * H / W;
      var mx = W * 0.18, my = H * 0.18;
      vb.x = Math.max(-mx, Math.min(W - vb.w + mx, vb.x));
      vb.y = Math.max(-my, Math.min(H - vb.h + my, vb.y));
    }
    function zoomAt(cx, cy, k) {
      var rect = svg.getBoundingClientRect();
      var px = (cx - rect.left) / rect.width * vb.w + vb.x;
      var py = (cy - rect.top) / rect.height * vb.h + vb.y;
      var nw = vb.w * k;
      vb.x = px - (px - vb.x) * (nw / vb.w);
      vb.y = py - (py - vb.y) * (nw / vb.h);
      vb.w = nw; clamp(); apply();
    }
    svg.addEventListener('dblclick', function () { vb = { x: 0, y: 0, w: W, h: H }; apply(); });
    /* v1.05.0 缩放平移重写：Ctrl/⌘+滚轮（触控板捏合同此）绕光标缩放，普通滚轮照常翻页不劫持；
       左键拖拽不做 pointer 捕获（不吞京点点击），位移超 6px 则本次点击作废；拖中按增量续锚，缩放不跳图。 */
    svg.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 0.88 : 1.14);
    }, { passive: false });
    (function () {
      var st = null, swallow = false;
      svg.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        st = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, moved: false };
      });
      window.addEventListener('pointermove', function (e) {
        if (!st) return;
        var ddx = e.clientX - st.x, ddy = e.clientY - st.y;
        if (!st.moved) {
          if (Math.abs(ddx) + Math.abs(ddy) < 6) return;
          st.moved = true;
          svg.classList.add('grabbing');
        }
        var r = svg.getBoundingClientRect();
        vb.x = st.vx - ddx / r.width * vb.w;
        vb.y = st.vy - ddy / r.height * vb.h;
        clamp(); apply();
        st.x = e.clientX; st.y = e.clientY; st.vx = vb.x; st.vy = vb.y;
      });
      window.addEventListener('pointerup', function () {
        if (st && st.moved) swallow = true;
        st = null;
        svg.classList.remove('grabbing');
      });
      window.addEventListener('pointercancel', function () { st = null; svg.classList.remove('grabbing'); });
      svg.addEventListener('click', function (e) {
        if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); }
      }, true);
    })();
    /* 图角三钮：放大 / 缩小 / 复位 */
    var wrap = svg.closest ? svg.closest('.map-wrap, .net-wrap') : null;
    if (wrap) {
      var bar = el('div', 'pz-bar');
      [['＋', 0.82], ['－', 1.22], ['复', 0]].forEach(function (bt) {
        var b = el('button'); b.type = 'button'; txt(b, bt[0]);
        b.setAttribute('aria-label', bt[1] ? (bt[1] < 1 ? '放大' : '缩小') : '复位');
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!bt[1]) vb = { x: 0, y: 0, w: W, h: H };
          else { var r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, bt[1]); }
          apply();
        });
        bar.appendChild(b);
      });
      var pzHint = el('span', 'pz-hint');
      txt(pzHint, 'Ctrl+滚轮');
      bar.appendChild(pzHint);
      wrap.appendChild(bar);
    }
  }

  function buildMap() {
    cityById = {};
    WXCITIES.forEach(function (c) { cityById[c.id] = c; });
    var svg = $('#mapSvg');
    svg.innerHTML = '';
    var defs = sv('defs', {}, svg);

    var lg = sv('linearGradient', { id: 'paperG', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    sv('stop', { offset: '0', 'stop-color': '#f2e6cb' }, lg);
    sv('stop', { offset: '1', 'stop-color': '#e2d0ab' }, lg);
    var lg2 = sv('linearGradient', { id: 'spineG', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
    sv('stop', { offset: '0', 'stop-color': '#6b5426' }, lg2);
    sv('stop', { offset: '.5', 'stop-color': '#c9a75c' }, lg2);
    sv('stop', { offset: '1', 'stop-color': '#54421f' }, lg2);
    var pat = sv('pattern', { id: 'ledger', width: '12', height: '26', patternUnits: 'userSpaceOnUse' }, defs);
    sv('line', { x1: '0', y1: '26', x2: '12', y2: '26', stroke: 'rgba(150,60,40,.16)', 'stroke-width': '1' }, pat);
    var fl = sv('filter', { id: 'pgShadow', x: '-6%', y: '-6%', width: '116%', height: '118%' }, defs);
    sv('feDropShadow', { dx: '0', dy: '10', stdDeviation: '16', 'flood-color': '#000000', 'flood-opacity': '.55' }, fl);
    var fog = sv('filter', { id: 'fogSoft', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
    sv('feGaussianBlur', { stdDeviation: '9' }, fog);
    var seaP = sv('pattern', { id: 'seaPat', width: '44', height: '16', patternUnits: 'userSpaceOnUse' }, defs);
    sv('path', { d: 'M0,12 q11,-7 22,0 t22,0', fill: 'none', stroke: 'rgba(44,74,82,.55)', 'stroke-width': '1.4' }, seaP);
    /* 画方只落纸面，不入书脊 */
    var pagesClip = sv('clipPath', { id: 'pagesClip' }, defs);
    sv('path', { d: 'M52,42 L456,34 L456,688 L52,698 Z' }, pagesClip);
    sv('path', { d: 'M544,34 L948,42 L948,698 L544,688 Z' }, pagesClip);

    /* 计里画方 */
    var gg = sv('g', { 'class': 'grid', 'clip-path': 'url(#pagesClip)' }, svg);
    (function () {
      var cell = WXMAP.grid.cell, x, y;
      for (x = 50; x <= 950; x += cell) {
        sv('line', { x1: x, y1: 28, x2: x, y2: 702 }, gg);
      }
      for (y = 50; y <= 700; y += cell) {
        sv('line', { x1: 50, y1: y, x2: 950, y2: y }, gg);
      }
    })();

    var left = sv('g', { 'class': 'pg' }, svg);
    sv('path', { d: 'M52,42 L456,34 L456,688 L52,698 Z', fill: 'url(#paperG)' }, left);
    sv('path', { d: 'M52,42 L456,34 L456,688 L52,698 Z', fill: 'url(#ledger)', opacity: '.8' }, left);
    var right = sv('g', { 'class': 'pg' }, svg);
    sv('path', { d: 'M544,34 L948,42 L948,698 L544,688 Z', fill: 'url(#paperG)' }, right);
    sv('path', { d: 'M544,34 L948,42 L948,698 L544,688 Z', fill: 'url(#ledger)', opacity: '.8' }, right);

    var vrule = function (x, y1, y2) {
      sv('line', { x1: x, y1: y1, x2: x, y2: y2, stroke: 'rgba(168,64,42,.5)', 'stroke-width': '1.2' }, svg);
    };
    vrule(64, 48, 688); vrule(444, 42, 690);
    vrule(556, 42, 690); vrule(936, 48, 688);
    sv('line', { x1: 58, y1: 56, x2: 450, y2: 50, stroke: 'rgba(168,64,42,.5)', 'stroke-width': '1.2' }, svg);
    sv('line', { x1: 550, y1: 50, x2: 942, y2: 56, stroke: 'rgba(168,64,42,.5)', 'stroke-width': '1.2' }, svg);
    sv('line', { x1: 58, y1: 684, x2: 450, y2: 678, stroke: 'rgba(168,64,42,.5)', 'stroke-width': '1.2' }, svg);
    sv('line', { x1: 550, y1: 678, x2: 942, y2: 684, stroke: 'rgba(168,64,42,.5)', 'stroke-width': '1.2' }, svg);

    sv('text', { x: 254, y: 80, 'text-anchor': 'middle', text: '阴　页', fill: 'rgba(160,64,42,.6)',
      style: 'font-family:KaiTi,STKaiti,Kaiti SC,serif;font-size:21.5px;letter-spacing:22px' }, svg);
    sv('text', { x: 746, y: 80, 'text-anchor': 'middle', text: '阳　页', fill: 'rgba(160,64,42,.6)',
      style: 'font-family:KaiTi,STKaiti,Kaiti SC,serif;font-size:21.5px;letter-spacing:22px' }, svg);

    /* 灰雾：页缘之外 */
    sv('ellipse', { cx: 46, cy: 420, rx: 40, ry: 260, fill: 'rgba(10,12,16,.62)', filter: 'url(#fogSoft)' }, svg);
    sv('ellipse', { cx: 956, cy: 420, rx: 40, ry: 260, fill: 'rgba(10,12,16,.62)', filter: 'url(#fogSoft)' }, svg);
    sv('text', { x: 26, y: 300, 'text-anchor': 'middle', text: '桩　外　之　雾', fill: 'rgba(90,100,115,.5)', transform: 'rotate(-90 26 300)',
      style: 'font-family:KaiTi,STKaiti,Kaiti SC,serif;font-size:12.5px;letter-spacing:8px' }, svg);
    sv('text', { x: 978, y: 460, 'text-anchor': 'middle', text: '账　外　之　地', fill: 'rgba(90,100,115,.5)', transform: 'rotate(90 978 460)',
      style: 'font-family:KaiTi,STKaiti,Kaiti SC,serif;font-size:12.5px;letter-spacing:8px' }, svg);

    var spine = sv('rect', { x: 456, y: 30, width: 88, height: 666, fill: 'url(#spineG)' }, svg);
    sv('line', { x1: 460, y1: 34, x2: 460, y2: 692, stroke: 'rgba(35,24,8,.55)', 'stroke-width': '2' }, svg);
    sv('line', { x1: 540, y1: 34, x2: 540, y2: 692, stroke: 'rgba(35,24,8,.55)', 'stroke-width': '2' }, svg);
    sv('line', { x1: 500, y1: 40, x2: 500, y2: 686, stroke: 'rgba(255,240,200,.35)', 'stroke-width': '1', 'stroke-dasharray': '4 5' }, svg);
    sv('circle', { cx: 500, cy: 62, r: 7, fill: '#2c2210', stroke: '#caa95f', 'stroke-width': '1.5' }, svg);
    sv('circle', { cx: 500, cy: 662, r: 7, fill: '#2c2210', stroke: '#caa95f', 'stroke-width': '1.5' }, svg);

    /* 金沟三桥 */
    var bridges = WXMAP.bridges || [150, 300, 450];
    var bgrp = sv('g', {}, svg);
    bridges.forEach(function (by) {
      sv('line', { x1: 448, y1: by, x2: 552, y2: by, stroke: 'rgba(60,42,15,.85)', 'stroke-width': '5', 'stroke-linecap': 'round' }, bgrp);
      sv('line', { x1: 448, y1: by, x2: 552, y2: by, stroke: '#d8bc78', 'stroke-width': '1.6', 'stroke-dasharray': '7 6' }, bgrp);
    });

    /* 地物：澜江 / 北屏山 / 桥注 */
    var lmg = sv('g', { 'class': 'lm' }, svg);
    sv('path', { id: 'lanRiver', d: 'M105,520 Q250,545 420,512', fill: 'none', stroke: 'rgba(52,96,110,.75)', 'stroke-width': '5', 'stroke-linecap': 'round', opacity: '.55' }, lmg);
    sv('path', { d: 'M105,520 Q250,545 420,512', fill: 'none', stroke: 'rgba(52,96,110,.9)', 'stroke-width': '1.4', 'stroke-dasharray': '3 7' }, lmg);
    var mountains = [[690, 552], [716, 540], [742, 556], [768, 542], [796, 558]];
    mountains.forEach(function (p) {
      sv('path', { d: 'M' + (p[0] - 14) + ',' + (p[1] + 12) + ' L' + p[0] + ',' + (p[1] - 10) + ' L' + (p[0] + 14) + ',' + (p[1] + 12), fill: 'none', stroke: 'rgba(74,84,66,.8)', 'stroke-width': '1.6' }, lmg);
    });
    WXMAP.landmarks.forEach(function (l) {
      sv('text', { x: l.x, y: l.y, 'text-anchor': 'middle', 'class': 'lm-t', text: l.t }, lmg);
      sv('text', { x: l.x, y: l.y + 14, 'text-anchor': 'middle', 'class': 'lm-s', text: l.s }, lmg);
    });

    /* 澜江行舟：三叶顺逆往来 */
    var boatG = sv('g', { 'class': 'boats' }, svg);
    for (var bi = 0; bi < 3; bi++) {
      var bp = sv('g', {}, boatG);
      sv('path', { d: 'M0,0 l7,2.5 l-13.5,2.5 z', fill: '#7a4a30', stroke: '#263746', 'stroke-width': '1', transform: 'translate(-9,-2)' }, bp);
      sv('line', { x1: 0, y1: 0, x2: 0, y2: -9, stroke: '#263746', 'stroke-width': '1.2' }, bp);
      sv('path', { d: 'M-3,-9 l3,4 v4 h-6 v-4 z', fill: '#c8a35a', opacity: '.9', stroke: '#263746', 'stroke-width': '.8' }, bp);
      var bm = sv('animateMotion', { dur: (34 + bi * 13) + 's', repeatCount: 'indefinite',
        keyPoints: bi % 2 ? '1;0' : '0;1', keyTimes: '0;1' }, bp);
      sv('mpath', { href: '#lanRiver' }, bm);
    }

    /* 道：kind 道＝页内陆路，桥＝渡金沟，脊＝沿装订线 */
    var roadG = sv('g', {}, svg);
    var rdGeom = [];
    WXMAP.roads.forEach(function (rd, i) {
      var a = cityById[rd.a], b = cityById[rd.b];
      if (!a || !b) return;
      var q = qPath(a, b, rd.r);
      var grp = sv('g', { 'class': 'rd rd-' + rd.kind + ' flow', 'data-i': i, tabindex: '0', role: 'button',
        'aria-label': rd.road + '，' + a.name + '通' + b.name + '，' + rd.li + '里' }, roadG);
      var p = sv('path', { d: q.d, 'class': 'road', id: 'road' + i }, grp);
      sv('path', { d: q.d, 'class': 'road-hit' }, grp);
      var tip = sv('title', {}, grp);
      tip.textContent = rd.road + '　' + a.name + ' ⇄ ' + b.name + '　·　' + rd.li + '里　·　' + rd.note;
      /* 沿道布铺：制如古驿，四铺一程，故每道三铺；每铺折里由道里除四得 */
      var segs = 4;
      for (var s = 1; s < segs; s++) {
        var k = s / segs, u = 1 - k;
        sv('circle', { cx: (u * u * a.pos[0] + 2 * u * k * q.cx + k * k * b.pos[0]).toFixed(1),
          cy: (u * u * a.pos[1] + 2 * u * k * q.cy + k * k * b.pos[1]).toFixed(1), r: 1.5, 'class': 'pu' }, grp);
      }
      rdGeom.push({ rd: rd, a: a, b: b, q: q, grp: grp,
        lb: sv('text', { 'text-anchor': 'middle', 'class': 'rd-lb' }, grp),
        ln: sv('text', { 'text-anchor': 'middle', 'class': 'rd-li' }, grp) });
      rdGeom[rdGeom.length - 1].lb.textContent = rd.road;
      rdGeom[rdGeom.length - 1].ln.textContent = cnNum(rd.li) + '里';
      var fl = sv('circle', { r: 2.2, 'class': 'fl-dot' }, grp);
      var am = sv('animateMotion', { dur: (16 + i * 3) + 's', repeatCount: 'indefinite', rotate: 'auto' }, fl);
      sv('mpath', { href: '#road' + i }, am);
    });

    /* 道名避让：沿道滑位求不撞，实在放不下就藏，悬停或点选时再显 */
    (function () {
      var PR = { '桥': 0, '脊': 1, '道': 2 };
      function box(cx, cy, w, h) { return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 }; }
      function clash(p, s) { return !(p.x1 + 3 < s.x0 || s.x1 + 3 < p.x0 || p.y1 + 2 < s.y0 || s.y1 + 2 < p.y0); }
      var kept = [];
      WXCITIES.forEach(function (c) {
        kept.push(box(c.pos[0], c.pos[1] + 21, 38, 15));
        kept.push(box(c.pos[0] + 8, c.pos[1] - 10, 18, 13));
      });
      kept.push(box(500, 340, 26, 210));                                  /* 金沟竖注 */
      kept.push(box(500, 22, 180, 26));                                   /* 存疑之框 */
      WXMAP.landmarks.forEach(function (l) { kept.push(box(l.x, l.y + 5, 110, 26)); });
      kept.push(box(215, 660, 74, 14)); kept.push(box(785, 660, 74, 14));  /* 坑／海名 */
      if (typeof WXSTAKES !== 'undefined') WXSTAKES.forEach(function (k) {
        if (k.pos) kept.push(box(k.pos[0], k.pos[1], 26, 26));              /* 界桩 */
      });
      function at(g2, t2) {
        var u = 1 - t2;
        return { x: u * u * g2.a.pos[0] + 2 * u * t2 * g2.q.cx + t2 * t2 * g2.b.pos[0],
                 y: u * u * g2.a.pos[1] + 2 * u * t2 * g2.q.cy + t2 * t2 * g2.b.pos[1] };
      }
      function nrm(g2, t2) {
        var u = 1 - t2, dx = 2 * u * (g2.b.pos[0] - g2.a.pos[0]) + 2 * t2 * (g2.q.cx - g2.a.pos[0]);
        var dy = 2 * u * (g2.b.pos[1] - g2.a.pos[1]) + 2 * t2 * (g2.q.cy - g2.a.pos[1]);
        var L = Math.hypot(dx, dy) || 1;
        return { x: -dy / L, y: dx / L };
      }
      rdGeom.slice(0).sort(function (m, n) { return (PR[m.rd.kind] - PR[n.rd.kind]) || (n.rd.li - m.rd.li); })
        .forEach(function (g2) {
          var w = Math.max(g2.rd.road.length * 10.5, (cnNum(g2.rd.li) + '里').length * 8) + 6;
          var found = null;
          for (var side = 0; side < 3 && !found; side++) {
            var off = [0, -14, 14][side];
            [0.5, 0.36, 0.64, 0.26, 0.74, 0.16, 0.84].forEach(function (t2) {
              if (found) return;
              var p = at(g2, t2), nv = nrm(g2, t2);
              var cx = p.x + nv.x * off, cy = p.y + nv.y * off;
              var bb = box(cx, cy, w, 22);
              if (bb.x0 < 58 || bb.x1 > 942 || bb.y0 < 42 || bb.y1 > 694) return;
              if (kept.some(function (s2) { return clash(bb, s2); })) return;
              found = { cx: cx, cy: cy, bb: bb };
            });
          }
          if (found) {
            setAttrs(g2.lb, { x: found.cx.toFixed(1), y: (found.cy - 3).toFixed(1) });
            setAttrs(g2.ln, { x: found.cx.toFixed(1), y: (found.cy + 9).toFixed(1) });
            kept.push(found.bb);
          } else {
            var mp = at(g2, 0.5);
            setAttrs(g2.lb, { x: mp.x.toFixed(1), y: (mp.y - 3).toFixed(1) });
            setAttrs(g2.ln, { x: mp.x.toFixed(1), y: (mp.y + 9).toFixed(1) });
            g2.grp.classList.add('hide-lb');
          }
        });
    })();
    var nodesGroup = sv('g', {}, svg);
    WXCITIES.forEach(function (c) {
      var g = sv('g', { 'class': 'nd' + (c.blank ? ' blank' : ''), 'data-id': c.id, tabindex: '0', role: 'button', 'aria-label': c.name + ' · ' + c.tower }, nodesGroup);
      sv('circle', { 'class': 'pulse', cx: c.pos[0], cy: c.pos[1], r: 11 }, g);
      sv('circle', { 'class': 'halo', cx: c.pos[0], cy: c.pos[1], r: 23 }, g);
      sv('circle', { 'class': 'hit', cx: c.pos[0], cy: c.pos[1], r: 26 }, g);
      sv('circle', { 'class': 'v', cx: c.pos[0], cy: c.pos[1], r: 6.8 }, g);
      sv('text', { 'class': 'nu', x: c.pos[0] + 10, y: c.pos[1] - 9, 'text-anchor': 'middle', text: WX_CITY_NUM[c.nu - 1],
        style: 'font-size:12.5px' }, g);
      sv('text', { 'class': 'lb', x: c.pos[0], y: c.pos[1] + 24 + (c.blank ? 14 : 0), 'text-anchor': 'middle', text: c.name }, g);
      if (c.tag) sv('text', { 'class': 'tg', x: c.pos[0], y: c.pos[1] + 42 + (c.blank ? 14 : 0), 'text-anchor': 'middle', text: c.tag }, g);
      var tip = sv('title', {}, g);
      tip.textContent = c.name + ' · ' + c.tower + ' — ' + c.motto;
    });

    /* 界桩：桩圈 + 桩身，按计里画方立图上。名不入图（图上有名的是京），
       悬停见桩号与桩位来路，点击入界桩志看全录。 */
    if (typeof WXSTAKES !== 'undefined') {
      var stG = sv('g', { 'class': 'stakes' }, svg);
      WXSTAKES.forEach(function (k) {
        if (!k.pos) return;
        var sx = k.pos[0], sy = k.pos[1];
        var sg = sv('g', { 'class': 'stake st-' + k.state, 'data-no': k.no, tabindex: '0', role: 'button',
          'aria-label': k.no + ' ' + k.name + '，' + k.state + '，' + k.measure }, stG);
        sv('circle', { cx: sx, cy: sy, r: 12.5, 'class': 'st-ring' }, sg);
        sv('path', { d: 'M' + (sx - 2) + ',' + (sy - 1.5) + ' L' + (sx - 2) + ',' + (sy - 9) +
          ' L' + sx + ',' + (sy - 10.5) + ' L' + (sx + 2) + ',' + (sy - 9) +
          ' L' + (sx + 2) + ',' + (sy - 1.5) + ' Z', 'class': 'st-post' }, sg);
        var noT = sv('text', { 'class': 'st-nos', x: sx, y: sy + 7.4, 'text-anchor': 'middle' }, sg);
        noT.textContent = k.no;
        sv('circle', { cx: sx, cy: sy, r: 12.5, 'class': 'st-ping' }, sg);
        var lb = sv('text', { 'class': 'st-lb', x: sx, y: sy - 18 }, sg);
        var noS = sv('tspan', { 'class': 'st-no', x: sx }, lb);
        noS.textContent = k.state;
        var nmS = sv('tspan', { 'class': 'st-nm', x: sx, dy: '12' }, lb);
        nmS.textContent = k.name;
        var tip = sv('title', {}, sg);
        tip.textContent = k.no + ' ' + k.name + '　' + k.state + '｜' + k.measure + '｜桩面：' + k.face;
      });
    }

    WXMAP.extras.forEach(function (ex) {
      if (ex.type === 'pit') {
        var g = sv('g', { tabindex: '0' }, svg);
        sv('circle', { cx: ex.pos[0], cy: ex.pos[1], r: 24, fill: 'none', stroke: '#7a4a30', 'stroke-width': '1.6', 'stroke-dasharray': '5 4' }, g);
        sv('circle', { cx: ex.pos[0], cy: ex.pos[1], r: 13, fill: 'none', stroke: '#7a4a30', 'stroke-width': '1', 'stroke-dasharray': '3 3' }, g);
        sv('circle', { cx: ex.pos[0], cy: ex.pos[1], r: 2.4, fill: '#5c241b' }, g);
        sv('text', { 'class': 'exl', x: ex.pos[0], y: ex.pos[1] + 40, 'text-anchor': 'middle', text: ex.name, fill: '#8a5a3c' }, g);
        var tip1 = sv('title', {}, g);
        tip1.textContent = '冲销坑 · 年结对不上账者坠入之待核巨窟，边上生白草。';
      } else if (ex.type === 'sea') {
        var g2 = sv('g', { tabindex: '0' }, svg);
        var wave = '';
        for (var w = 0; w < 3; w++) {
          wave += 'M' + (ex.pos[0] - 44) + ',' + (ex.pos[1] - 8 + w * 8) +
            ' q11,-7 22,0 t22,0 t22,0 t22,0';
        }
        sv('path', { d: wave, fill: 'none', stroke: '#2c4a52', 'stroke-width': '1.5', opacity: '.9' }, g2);
        sv('text', { 'class': 'exl', x: ex.pos[0], y: ex.pos[1] + 40, 'text-anchor': 'middle', text: ex.name, fill: '#3d646e' }, g2);
        var tip2 = sv('title', {}, g2);
        tip2.textContent = '废账海 · 作废账页漂成的海：漂着作废的世界、被推翻的预言、失约的誓言。';
      } else {
        sv('path', { d: 'M60,728 C240,746 760,746 940,728', fill: 'none', stroke: '#4a5a68', 'stroke-width': '1.6', 'stroke-dasharray': '9 7', opacity: '.8' }, svg);
        sv('text', { 'class': 'exl', x: 938, y: 714, 'text-anchor': 'end', text: '灰廊（页缝）', fill: '#55606e' }, svg);
      }
    });

    sv('text', { x: 500, y: 48, 'text-anchor': 'middle', text: '天账庭 · 存疑',
      style: 'font-family:Noto Serif SC,Songti SC,SimSun,serif;fill:#f4e3b3;font-size:13.5px;font-weight:600;letter-spacing:.34em;paint-order:stroke;stroke:rgba(11,14,18,.78);stroke-width:2.6px' }, svg);

    var lead = $('#mapLead');
    lead.innerHTML = '';
    txt(lead, '中界如一本摊开的账册：' + esc(WXMAP.left) + '六京、' + esc(WXMAP.right) + '六京，脊上悬着无名之塔。' + esc(WXMAP.spineNote) +
      '　图依计里画方，每方折地' + WXMAP.grid.li + '里。点京城观其志，点道线知其账往与里数；界桩十二根按里数立于图上，悬停见名，点击入界桩志。');

    var legend = $('#mapLegend');
    legend.innerHTML = '';
    legend.innerHTML = [
      '<span><i class="lg-dot"></i>入账之京</span>',
      '<span><i class="lg-dot blank"></i>冲销中（无字京）</span>',
      '<span><i class="lg-road"></i>道（点选观账往）</span>',
      '<span><i class="lg-bridge"></i>桥 · 渡金沟</span>',
      '<span><i class="lg-spine"></i>脊 · 通无字京</span>',
      '<span><i class="lg-grid"></i>画方 · 每方' + WXMAP.grid.li + '里</span>',
      '<span><i class="lg-stake"></i>界桩 · 点上开签　<i class="lg-st 在记"></i>在记<i class="lg-st 已销"></i>已销<i class="lg-st 自移"></i>自移<i class="lg-st 存疑"></i>存疑<i class="lg-st 赊"></i>赊</span>',
      '<span><i class="lg-pit"></i>冲销坑</span>',
      '<span><i class="lg-sea"></i>废账海</span>',
      '<span><i class="lg-line"></i>灰廊</span>',
      '<span><i class="lg-ghost"></i>存疑之地</span>'
    ].join('');
    svg.addEventListener('click', function (e) {
      var stEl = e.target.closest ? e.target.closest('.stake') : null;
      if (stEl) { var stNo = stEl.getAttribute('data-no'); markStake(stNo); openStake(stNo); return; }
      var ndEl = e.target.closest ? e.target.closest('.nd') : null;
      if (ndEl) { openCity(ndEl.getAttribute('data-id')); return; }
      var rdEl = e.target.closest ? e.target.closest('.rd') : null;
      if (rdEl) openRoad(+rdEl.getAttribute('data-i'));
    });
    svg.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest) {
        var stEl = e.target.closest('.stake');
        if (stEl) { e.preventDefault(); var stNo = stEl.getAttribute('data-no'); markStake(stNo); openStake(stNo); return; }
        var ndEl = e.target.closest('.nd');
        if (ndEl) { e.preventDefault(); openCity(ndEl.getAttribute('data-id')); return; }
        var rdEl = e.target.closest('.rd');
        if (rdEl) { e.preventDefault(); openRoad(+rdEl.getAttribute('data-i')); }
      }
    });
    attachPanZoom(svg, 1000, 760);
    openCity('zhao');
  }
  function openCity(id) {
    var c = cityById[id] || WXCITIES.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    $$('#mapSvg .nd').forEach(function (g) {
      g.classList.toggle('sel', g.getAttribute('data-id') === id);
    });
    $$('#mapSvg .rd.sel').forEach(function (g) { g.classList.remove('sel'); });
    var box = $('#cityDetail');
    box.innerHTML = '';
    box.appendChild(txt(el('p', 'cd-kicker'), '卷宗 · 第' + WX_CITY_NUM[c.nu - 1] + '京'));
    var h = el('div', 'cd-head');
    h.appendChild(txt(el('span', 'cd-nu'), GameNum(c.nu)));
    h.appendChild(txt(el('h4'), c.name));
    h.appendChild(txt(el('span', 'cd-page'), c.page));
    box.appendChild(h);
    box.appendChild(txt(el('p', 'cd-tower'), '总账塔 · ' + c.tower));
    box.appendChild(txt(el('blockquote', 'cd-motto'), c.motto));
    if (typeof WXCITYSAYINGS !== 'undefined') {
      var ps = null;
      for (var si = 0; si < WXCITYSAYINGS.length; si++) {
        if (WXCITYSAYINGS[si].indexOf(c.name + '：') === 0) ps = WXCITYSAYINGS[si];
      }
      if (ps) box.appendChild(txt(el('p', 'cd-proverb'), ps.replace(c.name + '：', '京谚 · ')));
    }
    box.appendChild(txt(el('p', 'cd-text'), c.text));
    /* 计里画方之验：京应落格点。不落者非疏漏，乃图上实状 —— 无字京方位存疑。 */
    var cell = WXMAP.grid.cell, fx = c.pos[0] % cell, fy = c.pos[1] % cell;
    var lat = el('p', 'cd-lat');
    if (!fx && !fy) txt(lat, '画方核验：此京正落格点，图上可量。');
    else txt(lat, '画方核验：此京偏出格点　横 ' + fx + ' 度 · 纵 ' + fy + ' 度（合 ' +
      ((fx + fy) * 2 / 5).toFixed(1) + ' 里）—— 格上量不到它，方位存疑。');
    box.appendChild(lat);
    if (c.goods.length) {
      var g = el('div', 'cd-goods');
      c.goods.forEach(function (gd) {
        var s = el('span', 'chip');
        txt(s, '物 · ' + gd);
        g.appendChild(s);
      });
      box.appendChild(g);
    }
    var hk = el('div', 'cd-hook');
    hk.appendChild(txt(el('b'), '账缝钩'));
    hk.appendChild(txt(el('p'), c.hook));
    box.appendChild(hk);
    var rel = WXMAP.roads.filter(function (r) { return r.a === id || r.b === id; });
    if (rel.length) {
      var rg = el('div', 'cd-roads');
      rg.appendChild(txt(el('b'), '道　路'));
      rel.forEach(function (r) {
        var other = r.a === id ? r.b : r.a;
        var o = cityById[other];
        var row = el('div', 'cd-road');
        row.appendChild(txt(el('span', 'cr-name'), o ? o.name : other));
        row.appendChild(txt(el('span', 'cr-note'), r.note));
        row.addEventListener('click', function () { openCity(other); });
        rg.appendChild(row);
      });
      box.appendChild(rg);
    }
  }
  function openRoad(i) {
    var rd = WXMAP.roads[i];
    if (!rd) return;
    var a = cityById[rd.a], b = cityById[rd.b];
    if (!a || !b) return;
    $$('#mapSvg .nd.sel').forEach(function (g) { g.classList.remove('sel'); });
    $$('#mapSvg .rd').forEach(function (g) { g.classList.toggle('sel', +g.getAttribute('data-i') === i); });
    var KIND = { '道': '页内陆路', '桥': '渡金沟', '脊': '沿装订线' };
    var box = $('#cityDetail');
    box.innerHTML = '';
    box.appendChild(txt(el('p', 'cd-kicker'), '道里 · ' + (KIND[rd.kind] || '道')));
    var h = el('div', 'cd-head');
    h.appendChild(txt(el('h4'), rd.road));
    h.appendChild(txt(el('span', 'cd-page'), rd.li + ' 里'));
    box.appendChild(h);
    box.appendChild(txt(el('p', 'cd-tower'), a.name + '（' + a.tower + '）　⇄　' + b.name + '（' + b.tower + '）'));
    box.appendChild(txt(el('blockquote', 'cd-motto'), rd.note));
    box.appendChild(txt(el('p', 'cd-text'),
      (rd.kind === '桥' ? '此桥横跨金沟，' : rd.kind === '脊' ? '此脊沿装订线而行，' : '此道行于账页之内，') +
      '图上量弧 ' + rd.li + ' 里。图依计里画方，每方折地 ' + WXMAP.grid.li + ' 里，故道之长短可于格上覆量。' +
      '道旁三铺，四铺一程，此道每铺折里 ' + (rd.li / 4) + ' —— 铺距因道长短而殊，勾稽时即以里数除四核之。'));
    var rg = el('div', 'cd-roads');
    rg.appendChild(txt(el('b'), '两　端'));
    [rd.a, rd.b].forEach(function (cid) {
      var o = cityById[cid];
      var row = el('div', 'cd-road');
      row.appendChild(txt(el('span', 'cr-name'), o.name));
      row.appendChild(txt(el('span', 'cr-note'), o.tower + ' · ' + o.tag));
      row.addEventListener('click', function () { openCity(cid); });
      rg.appendChild(row);
    });
    box.appendChild(rg);
  }
  function GameNum(n) {
    return '一二三四五六七八九十'[n - 1] || n;
  }

  /* ---------------- 力量等级 ---------------- */
  function buildPower() {
    txt($('#powerIntro'), WXCORE.levels.intro);
    var wrap = $('#levels');
    wrap.innerHTML = '';
    WXCORE.levels.list.forEach(function (lv) {
      var card = el('article', 'lv' + (lv.ghost ? ' ghost' : ''));
      if (lv.ghost) card.appendChild(txt(el('span', 'ghost-rib'), '存疑'));
      card.appendChild(txt(el('div', 'lv-num'), lv.numeral));
      card.appendChild(txt(el('h4', 'lv-name'), lv.name));
      card.appendChild(txt(el('span', 'lv-amt'), lv.amt));
      card.appendChild(txt(el('div', 'lv-test'), lv.test));
      card.appendChild(txt(el('p', 'lv-note'), lv.note));
      wrap.appendChild(card);
    });
    txt($('#falsifyIntro'), WXCORE.falsify.intro);
    var fq = $('#falsify');
    fq.innerHTML = '';
    WXCORE.falsify.qs.forEach(function (q) {
      var d = el('details', 'fq');
      d.appendChild(txt(el('summary'), q.q));
      d.appendChild(txt(el('div', 'a'), q.a));
      fq.appendChild(d);
    });
    var end = $('#falsifyEnd');
    end.innerHTML = '';
    var verdict = el('span');
    txt(verdict, WXCORE.falsify.verdict);
    end.appendChild(verdict);
    var credit = el('span', 'falsify-credit');
    txt(credit, '　　' + WXCORE.falsify.credit);
    end.appendChild(credit);
  }

  /* ---------------- 众生谱 ---------------- */
  function buildBeings() {
    var tabs = $('#beingTabs');
    tabs.innerHTML = '';
    var CATCOLOR = { '公门': 'c0', '修士': 'c1', '众生': 'c2', '异物': 'c3', '邪路': 'c4' };
    function renderBeings(cat) {
      var grid = $('#beingGrid');
      grid.innerHTML = '';
      WXBEINGS.filter(function (b) { return cat === '全部' || b.cat === cat; }).forEach(function (b) {
        var card = el('article', 'being');
        var top = el('div', 'being-top');
        top.appendChild(txt(el('h4'), b.name));
        top.appendChild(txt(el('span', 'also'), b.also));
        card.appendChild(top);
        var chip = el('span', 'chip ' + (CATCOLOR[b.cat] || 'c2'));
        txt(chip, b.cat);
        card.appendChild(chip);
        card.appendChild(txt(el('p', 'head'), b.head));
        var tpb = el('p', 'text');
        var seenB = {};
        tpb.appendChild(lrDecorate(b.text, seenB, false));
        card.appendChild(tpb);
        var tr = el('div', 'traits');
        b.traits.forEach(function (t) { tr.appendChild(txt(el('span'), t)); });
        card.appendChild(tr);
        /* v1.13.0 是谱有卷：谱卡挂回卷签，与岁令回卷同构 */
        var sidB = PU_STORY[b.name];
        if (sidB) {
          var stB = WXSTORIES.filter(function (x) { return x.id === sidB; })[0];
          if (stB) {
            var vbB = el('button', 'sj-src ling-chip');
            txt(vbB, '是谱有卷 · ' + stB.no + '《' + stB.title + '》');
            vbB.setAttribute('title', '回该卷');
            vbB.addEventListener('click', function (e) { e.stopPropagation(); volGo(stB.no); });
            card.appendChild(vbB);
          }
        }
        linkVolumes(card);
        grid.appendChild(card);
      });
    }
    $('#beingGrid').addEventListener('click', function (e) {
      var lx = e.target.closest ? e.target.closest('.lx') : null;
      if (lx) lrGo(lx);
    });
    var cur = '全部';
    function addTab(label) {
      var cnt = label === '全部' ? WXBEINGS.length : WXBEINGS.filter(function (b) { return b.cat === label; }).length;
      var chip = el('button', 'chip' + (label === cur ? ' on' : ''));
      chip.setAttribute('data-cat', label);
      txt(chip, label + ' · ' + cnt);
      chip.addEventListener('click', function () {
        cur = label;
        $$('#beingTabs .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-cat') === label); });
        renderBeings(cur);
      });
      tabs.appendChild(chip);
    }
    addTab('全部');
    WXBEING_CATS.forEach(addTab);
    renderBeings(cur);
  }

  /* ---------------- 历纪 ---------------- */
  function buildTimeline() {
    txt($('#tlUnit'), WXTIMELINE.unit);
    var wrap = $('#tlList');
    wrap.innerHTML = '';
    WXTIMELINE.eras.forEach(function (er) {
      var era = el('div', 'tl-era' + (er.live ? ' live' : ''));
      var o = el('div', 'tlo');
      o.appendChild(txt(el('span', 'no'), er.no));
      o.appendChild(txt(el('span', 'name'), er.name));
      o.appendChild(txt(el('span', 'span'), er.span));
      era.appendChild(o);
      var ul = el('ul');
      er.events.forEach(function (e) { ul.appendChild(txt(el('li'), e)); });
      era.appendChild(ul);
      wrap.appendChild(era);
    });
  }

  /* ---------------- 词库 ---------------- */
  function buildLexicon() {
    var chips = $('#lexChips');
    chips.innerHTML = '';
    var curCat = '全部';
    var q = '';
    function addChip(label) {
      var ch = el('button', 'chip' + (label === curCat ? ' on' : ''));
      txt(ch, label);
      ch.addEventListener('click', function () {
        curCat = label;
        $$('#lexChips .chip').forEach(function (c) { c.classList.toggle('on', c.textContent === label); });
        render();
      });
      chips.appendChild(ch);
    }
    addChip('全部');
    WXLEXICON_CATS.forEach(addChip);
    function render() {
      var host = $('#lexList');
      host.innerHTML = '';
      var list = WXLEXICON.filter(function (x) {
        var mCat = curCat === '全部' || x.cat === curCat;
        var kw = q.trim();
        var mQ = !kw || x.t.indexOf(kw) >= 0 || x.d.indexOf(kw) >= 0 || x.p.indexOf(kw.toLowerCase()) >= 0;
        return mCat && mQ;
      });
      txt($('#lexCount'), '共 ' + list.length + ' 条　/　全库 ' + WXLEXICON.length + ' 条');
      if (!list.length) {
        host.appendChild(txt(el('div', 'empty-tip'), '账上无此条目。'));
        return;
      }
      list.forEach(function (x) {
        var d = el('details', 'term');
        var s = el('summary');
        s.appendChild(txt(el('span', 't'), x.t));
        s.appendChild(txt(el('span', 'p'), x.p));
        s.appendChild(txt(el('span', 'cat'), x.cat));
        d.appendChild(s);
        d.appendChild(txt(el('div', 'd'), x.d));
        host.appendChild(d);
      });
    }
    $('#lexSearch').addEventListener('input', function (e) {
      q = e.target.value;
      render();
    });
    render();
  }

  /* ---------------- 人间试账（三案皆明示贷方与余账） ---------------- */
  function buildTrial() {
    var grid = $('#trialGrid');
    if (!grid || typeof WXTRIALS === 'undefined') return;
    txt($('#trialIntro'), '三笔账，三种难处：借来之物从何处取，未知之事怎样落笔，边界退去时谁先被看见。这里不是替世界判善恶，而是把决定的代价摊开。');
    grid.innerHTML = '';
    WXTRIALS.forEach(function (c, idx) {
      var card = el('article', 'trial-card');
      card.id = 'trial-' + c.id;
      var head = el('div', 'trial-head');
      var no = el('span', 'trial-no'); txt(no, '案 ' + c.no); head.appendChild(no);
      var name = el('h4', 'trial-title'); txt(name, c.title); head.appendChild(name);
      var place = el('button', 'trial-place'); txt(place, c.place + ' ↗');
      place.type = 'button'; place.addEventListener('click', function () { show('map'); openCity(c.cityId); });
      head.appendChild(place); card.appendChild(head);
      var laws = el('div', 'trial-laws');
      c.law.forEach(function (law) { laws.appendChild(txt(el('span', 'trial-law'), law)); });
      card.appendChild(laws);
      card.appendChild(txt(el('p', 'trial-premise'), c.premise));
      card.appendChild(txt(el('p', 'trial-question'), c.question));
      var options = el('div', 'trial-options');
      var result = el('div', 'trial-result');
      result.setAttribute('aria-live', 'polite');
      result.appendChild(txt(el('p', 'trial-idle'), '择一案试账；选项可以反复切换。账面不替你作答，只把来路与余账照亮。'));
      c.choices.forEach(function (choice) {
        var btn = el('button', 'trial-choice');
        btn.type = 'button'; btn.setAttribute('aria-pressed', 'false');
        btn.appendChild(txt(el('span', 'tc-label'), choice.title));
        btn.appendChild(txt(el('span', 'tc-cue'), '掀开此案 ↗'));
        btn.addEventListener('click', function () {
          $$('.trial-choice', options).forEach(function (b) {
            var active = b === btn;
            b.classList.toggle('on', active);
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          result.innerHTML = '';
          result.appendChild(txt(el('p', 'tr-verdict'), choice.verdict));
          var flow = el('div', 'trial-flow');
          [
            ['贷方 · 从何处来', choice.credit],
            ['借方 · 落到何处', choice.debit],
            ['余账 · 尚待何人承担', choice.remainder]
          ].forEach(function (item) {
            var row = el('div', 'tr-line');
            row.appendChild(txt(el('span', 'tr-key'), item[0]));
            row.appendChild(txt(el('p', 'tr-value'), item[1]));
            flow.appendChild(row);
          });
          result.appendChild(flow);
          result.appendChild(txt(el('p', 'tr-note'), choice.note));
        });
        options.appendChild(btn);
      });
      card.appendChild(options); card.appendChild(result); grid.appendChild(card);
    });
  }

  /* ---------------- 仓衡三制（丰收、青黄、水患三种仓事） ---------------- */
  function buildGranaries() {
    var modeBox = $('#granaryModes'), panel = $('#granaryPanel'), storesBox = $('#granaryStores');
    if (!modeBox || !panel || !storesBox || typeof WXGRANARIES === 'undefined') return;
    txt($('#granaryIntro'), WXGRANARIES.intro);
    var current = WXGRANARIES.seasons[0].id;
    function renderMode(id) {
      var mode = WXGRANARIES.seasons.filter(function (m) { return m.id === id; })[0];
      if (!mode) return;
      current = id;
      $$('.granary-mode', modeBox).forEach(function (b) {
        var on = b.getAttribute('data-mode') === id;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      panel.innerHTML = '';
      panel.appendChild(txt(el('p', 'gp-summary'), mode.summary));
      var moves = el('div', 'gp-moves');
      mode.moves.forEach(function (m, i) {
        var row = el('article', 'gp-move');
        row.appendChild(txt(el('span', 'gp-step'), '0' + (i + 1)));
        row.appendChild(txt(el('h4', 'gp-store'), m.store));
        row.appendChild(txt(el('p', 'gp-act'), m.act));
        moves.appendChild(row);
      });
      panel.appendChild(moves);
      panel.appendChild(txt(el('p', 'gp-audit'), '勾稽口 · ' + mode.audit));
    }
    modeBox.innerHTML = '';
    WXGRANARIES.seasons.forEach(function (m) {
      var b = el('button', 'chip granary-mode');
      b.type = 'button'; b.setAttribute('data-mode', m.id); b.setAttribute('aria-pressed', 'false');
      txt(b, m.name); b.addEventListener('click', function () { renderMode(m.id); });
      modeBox.appendChild(b);
    });
    storesBox.innerHTML = '';
    WXGRANARIES.stores.forEach(function (s, i) {
      var card = el('article', 'granary-store');
      card.id = 'grain-store-' + s.id;
      card.appendChild(txt(el('span', 'gs-mark'), '仓制 · ' + s.mark));
      card.appendChild(txt(el('h4', 'gs-title'), s.name));
      card.appendChild(txt(el('p', 'gs-place'), s.place));
      card.appendChild(txt(el('p', 'gs-role'), s.role));
      var guard = el('p', 'gs-rule');
      guard.appendChild(txt(el('b'), '守则　')); guard.appendChild(document.createTextNode(s.guard));
      card.appendChild(guard);
      var risk = el('p', 'gs-risk');
      risk.appendChild(txt(el('b'), '账缝　')); risk.appendChild(document.createTextNode(s.risk));
      card.appendChild(risk);
      storesBox.appendChild(card);
    });
    window.__wx_setGranaryMode = renderMode;
    renderMode(current);
  }

  /* 城名 → 城对象：索引与货殖两页共用的图内查 */
  function cityByName(n) {
    for (var i = 0; i < WXCITIES.length; i++) if (WXCITIES[i].name === n) return WXCITIES[i];
    return null;
  }

  /* ---------------- 索引（一索全书） ---------------- */
  function buildFind() {
    var inp = $('#findSearch'), host = $('#findList'), cntEl = $('#findCount');
    if (!inp || !host) return;
    var stats = $('#findStats'), sourceBox = $('#findSources'), quickBox = $('#findQuick');
    var moreBtn = $('#findMore'), clearBtn = $('#findClear');
    var activeSource = '全部', visibleLimit = 40;
    var SOURCES = [
      { name: '词库', rows: WXLEXICON.map(function (x) { return { t: x.t, s: x.p + '　' + x.cat + '　' + x.d, goto: 'lexicon' }; }) },
      { name: '异闻', rows: WXSTORIES.map(function (x) { return { t: x.no + '《' + x.title + '》', s: x.sub + '　' + x.paras.join('') + '　' + x.tail, goto: 'stories' }; }) },
      { name: '人物', rows: WXCHARS.map(function (x) { return { t: x.name + ' · ' + x.title, s: x.place + '　' + x.temper + '　' + x.text, goto: 'characters' }; }) },
      { name: '十三京', rows: WXCITIES.map(function (x) { return { t: x.name + ' · ' + x.tower, s: x.text + '　' + x.hook, goto: 'map', cid: x.id }; }).concat(
        (typeof WXCITYSAYINGS !== 'undefined' ? WXCITYSAYINGS : []).map(function (sy) {
          var p = sy.indexOf('：'), cn = p >= 0 ? sy.slice(0, p) : '';
          var csa = cityByName(cn);
          return { t: sy, s: '京谚 · ' + cn + '卷宗所见', goto: 'map', cid: csa ? csa.id : null };
        })) },
      { name: '货殖', rows: (typeof WXGOODS !== 'undefined' ? WXGOODS : []).map(function (x) {
          var cgo = cityByName(x.city);
          return { t: x.n + ' · ' + x.city, s: x.d, goto: 'goods', cid: cgo ? cgo.id : null };
        }) },
      { name: '界桩', rows: (typeof WXSTAKES !== 'undefined' ? WXSTAKES : []).map(function (x) { return { t: x.name + ' · ' + x.no, s: x.where + '　' + x.state + '　桩面：' + x.face + '　' + x.note, goto: 'stakes' }; }) },
      { name: '公门', rows: (typeof WXORGANS !== 'undefined' ? WXORGANS : []).map(function (x) { return { t: x.n + ' · ' + x.role, s: x.seat + '　主事：' + x.head + '　规矩：' + x.law + '　' + (x.ref || ''), goto: 'organs' }; }) },
      { name: '卷线', rows: (typeof WXARCS !== 'undefined' ? WXARCS : []).map(function (x) { return { t: x.n + ' · ' + x.s.length + ' 卷', s: x.d + '　' + x.s.join(' '), goto: 'stories' }; }) },
      { name: '故纸', rows: (typeof WXDOCS !== 'undefined' ? WXDOCS : []).map(function (x) { return { t: x.n + ' · ' + x.kind, s: x.seat + '　' + x.when + '　' + x.text + '　' + (x.ref || ''), goto: 'docs' }; }) },
      { name: '岁令', rows: (typeof WXSUILING !== 'undefined' ? WXSUILING.months : []).map(function (x) { return { t: x.m + ' · ' + x.name, s: x.order + '　' + x.text, goto: 'suiling' }; }) },
      { name: '账房谚', rows: (typeof WXSAYINGS !== 'undefined' ? WXSAYINGS : []).map(function (s) { return { t: s, s: '账房谚 · 拾句页可抄', goto: 'shiju' }; }) },
      { name: '众生谱', rows: (typeof WXBEINGS !== 'undefined' ? WXBEINGS : []).map(function (x) { return { t: x.name + ' · ' + x.also, s: x.cat + '　' + x.head + '　' + x.text, goto: 'beings', cid: x.cat }; }) },
      { name: '历纪', rows: (typeof WXTIMELINE !== 'undefined' && WXTIMELINE.eras ? WXTIMELINE.eras : []).map(function (x) { return { t: x.name + ' · ' + x.no, s: x.events.join('　'), goto: 'timeline' }; }) },
      { name: '更新志', rows: (typeof WXUPDATES !== 'undefined' ? WXUPDATES : []).map(function (x) { return { t: x.v + ' · ' + x.title, s: x.items.join('　'), goto: 'updates' }; }) },
      { name: '试账', rows: (typeof WXTRIALS !== 'undefined' ? WXTRIALS : []).map(function (x) {
          return { t: '案' + x.no + '《' + x.title + '》 · ' + x.place,
            s: x.premise + '　' + x.question + '　' + x.choices.map(function (c) { return c.title + ' ' + c.credit + ' ' + c.debit + ' ' + c.remainder + ' ' + c.verdict; }).join('　'),
            goto: 'trial', caseId: x.id };
        }) },
      { name: '仓衡', rows: (typeof WXGRANARIES !== 'undefined' ? WXGRANARIES.stores.map(function (x) {
          return { t: x.name + ' · ' + x.mark, s: x.place + '　' + x.role + '　' + x.guard + '　' + x.risk, goto: 'goods', targetId: 'grain-store-' + x.id };
        }).concat(WXGRANARIES.seasons.map(function (x) {
          return { t: '仓事 · ' + x.name, s: x.summary + '　' + x.moves.map(function (m) { return m.store + '：' + m.act; }).join('　') + '　' + x.audit, goto: 'goods', modeId: x.id };
        })) : []) }
    ];
    var totalRows = SOURCES.reduce(function (n, s) { return n + s.rows.length; }, 0);
    if (stats) txt(stats, '全书 ' + SOURCES.length + ' 源 · ' + totalRows + ' 笔可索；空格分隔多个词，须同时命中。');
    function setQuick(value) {
      inp.value = value;
      visibleLimit = 40;
      render();
      inp.focus();
    }
    if (sourceBox) {
      sourceBox.innerHTML = '';
      ['全部'].concat(SOURCES.map(function (s) { return s.name; })).forEach(function (name) {
        var btn = el('button', 'chip' + (name === activeSource ? ' on' : ''));
        btn.type = 'button'; btn.setAttribute('aria-pressed', name === activeSource ? 'true' : 'false');
        txt(btn, name);
        btn.addEventListener('click', function () {
          activeSource = name; visibleLimit = 40;
          $$('.chip', sourceBox).forEach(function (b) {
            var active = b.textContent === activeSource;
            b.classList.toggle('on', active); b.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          render();
        });
        sourceBox.appendChild(btn);
      });
    }
    if (quickBox) {
      quickBox.innerHTML = '';
      ['灶君', '失页', '晏京', '无字京', '账不平'].forEach(function (word) {
        var btn = el('button', 'chip find-sample');
        btn.type = 'button'; txt(btn, word);
        btn.addEventListener('click', function () { setQuick(word); });
        quickBox.appendChild(btn);
      });
    }
    function escapeHTML(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function highlighter(str, terms) {
      var ranges = [];
      var lower = str.toLocaleLowerCase();
      terms.forEach(function (term) {
        var token = term.toLocaleLowerCase(), at = 0;
        while ((at = lower.indexOf(token, at)) >= 0) {
          ranges.push([at, at + token.length]);
          at += Math.max(1, token.length);
        }
      });
      if (!ranges.length) return escapeHTML(str);
      ranges.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
      var out = '', last = 0;
      ranges.forEach(function (r) {
        if (r[1] <= last) return;
        var start = Math.max(last, r[0]);
        out += escapeHTML(str.slice(last, start)) + '<span class="hl">' + escapeHTML(str.slice(start, r[1])) + '</span>';
        last = r[1];
      });
      return out + escapeHTML(str.slice(last));
    }
    function snip(s, terms) {
      var lower = s.toLocaleLowerCase(), pos = -1, width = terms[0].length;
      terms.forEach(function (term) {
        var i = lower.indexOf(term.toLocaleLowerCase());
        if (i >= 0 && (pos < 0 || i < pos)) { pos = i; width = term.length; }
      });
      if (pos < 0) return s.slice(0, 64) + (s.length > 64 ? '……' : '');
      var a = Math.max(0, pos - 12), b = Math.min(s.length, pos + width + 32);
      return (a > 0 ? '……' : '') + s.slice(a, b) + (b < s.length ? '……' : '');
    }
    function render() {
      var kw = inp.value.trim();
      var terms = kw.split(/\s+/).filter(Boolean);
      host.innerHTML = '';
      if (moreBtn) moreBtn.hidden = true;
      txt(cntEl, '');
      if (!terms.length || terms.join('').length < 2) {
        host.appendChild(txt(el('div', 'empty-tip'), '书上无名，笔下无人——写下两个字，或点一枚引签试索。'));
        return;
      }
      var hits = [];
      SOURCES.forEach(function (src, si) {
        if (activeSource !== '全部' && src.name !== activeSource) return;
        src.rows.forEach(function (r, ri) {
          var title = r.t.toLocaleLowerCase();
          var body = r.s.toLocaleLowerCase();
          var all = terms.every(function (term) { var t = term.toLocaleLowerCase(); return title.indexOf(t) >= 0 || body.indexOf(t) >= 0; });
          if (!all) return;
          var titleAll = terms.every(function (term) { return title.indexOf(term.toLocaleLowerCase()) >= 0; });
          var titleExact = terms.every(function (term) { return title === term.toLocaleLowerCase(); });
          var titlePrefix = terms.every(function (term) { return title.indexOf(term.toLocaleLowerCase()) === 0; });
          var rank = titleExact ? 0 : titlePrefix ? 1 : titleAll ? 2 : 3;
          hits.push({ label: src.name, t: r.t, s: r.s, goto: r.goto, cid: r.cid, caseId: r.caseId, targetId: r.targetId, modeId: r.modeId, rank: rank, si: si, ri: ri });
        });
      });
      hits.sort(function (a, b) { return a.rank - b.rank || a.si - b.si || a.ri - b.ri; });
      var totalHits = hits.length, shown = hits.slice(0, visibleLimit);
      if (!totalHits) {
        txt(cntEl, '勾得空账　——　试换词，或点「全部」撤去来源筛选。');
        host.appendChild(txt(el('div', 'empty-tip'), '账上无此条目。'));
        return;
      }
      txt(cntEl, '勾得 ' + totalHits + ' 笔' + (activeSource !== '全部' ? ' · ' + activeSource : '') + '；当前展 ' + shown.length + ' 笔' + (shown.length < totalHits ? '，余下可续展。' : '。'));
      shown.forEach(function (h) {
        var row = el('div', 'find-hit');
        row.setAttribute('role', 'button'); row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label', h.label + '：' + h.t + '。按回车打开');
        row.appendChild(txt(el('span', 'fh-kicker'), h.label));
        var tt = el('div', 'fh-t'); tt.innerHTML = highlighter(h.t, terms); row.appendChild(tt);
        var ss = el('div', 'fh-s'); ss.innerHTML = highlighter(snip(h.s, terms), terms); row.appendChild(ss);
        function go() {
          show(h.goto);
          if (h.goto === 'trial' && h.caseId) {
            var target = $('#trial-' + h.caseId);
            if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); target.classList.add('trial-flash'); setTimeout(function () { target.classList.remove('trial-flash'); }, 1800); }
            return;
          }
          if (h.goto === 'goods' && h.cid) { var cit = cityById[h.cid]; var chip = cit ? document.querySelector('#goodsTabs .chip[data-cat="' + cit.name + '"]') : null; if (chip) chip.click(); return; }
          if (h.goto === 'goods' && h.modeId && window.__wx_setGranaryMode) {
            window.__wx_setGranaryMode(h.modeId);
            var modeTarget = $('#granaryPanel');
            if (modeTarget) { modeTarget.scrollIntoView({ behavior: 'smooth', block: 'start' }); modeTarget.classList.add('trial-flash'); setTimeout(function () { modeTarget.classList.remove('trial-flash'); }, 1800); }
            return;
          }
          if (h.goto === 'goods' && h.targetId) {
            var grainTarget = $('#' + h.targetId);
            if (grainTarget) { grainTarget.scrollIntoView({ behavior: 'smooth', block: 'start' }); grainTarget.classList.add('trial-flash'); setTimeout(function () { grainTarget.classList.remove('trial-flash'); }, 1800); }
            return;
          }
          if (h.goto === 'beings' && h.cid) { var bch = document.querySelector('#beingTabs .chip[data-cat="' + h.cid + '"]'); if (bch) bch.click(); return; }
          if (h.cid && typeof openCity === 'function') openCity(h.cid);
        }
        row.addEventListener('click', go);
        row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        host.appendChild(row);
      });
      if (moreBtn && shown.length < totalHits) {
        moreBtn.hidden = false;
        txt(moreBtn, '再展四十笔 · 已展 ' + shown.length + ' / ' + totalHits);
      }
    }
    inp.addEventListener('input', function () { visibleLimit = 40; render(); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { inp.value = ''; visibleLimit = 40; render(); }
      if (e.key === 'Enter') {
        var first = $('.find-hit', host);
        if (first) { e.preventDefault(); first.click(); }
      }
    });
    if (clearBtn) clearBtn.addEventListener('click', function () { inp.value = ''; visibleLimit = 40; render(); inp.focus(); });
    if (moreBtn) moreBtn.addEventListener('click', function () { visibleLimit += 40; render(); });
    render();
  }

  /* ---------------- 货殖（三十六物按京入册） ---------------- */
  function buildGoods() {
    var tabs = $('#goodsTabs'), grid = $('#goodsGrid');
    if (!tabs || !grid || typeof WXGOODS === 'undefined') return;
    txt($('#goodsLead'), '货殖一册，' + cnNum(WXGOODS.length) + ' 物入账，物物有账；无字京正在冲销，册上无货。按京择筛；点货就地打钩细看，点「城」签才入京卷宗——去了，浏览器返回键带回原位。');
    var cur = '全部';
    function render(c) {
      grid.innerHTML = '';
      WXGOODS.filter(function (g) { return c === '全部' || g.city === c; }).forEach(function (g) {
        var card = el('article', 'being goods-card');
        card.setAttribute('tabindex', '0');
        var top = el('div', 'being-top');
        top.appendChild(txt(el('h4'), g.n));
        top.appendChild(txt(el('span', 'also'), g.city));
        card.appendChild(top);
        var gtxt = el('p', 'text');
        var seenG = {};
        gtxt.appendChild(lrDecorate(g.d, seenG, false));
        card.appendChild(gtxt);
        function go() {
          var cit = cityByName(g.city);
          show('map');
          if (cit) openCity(cit.id);
        }
        /* v1.04.0 点货就地打钩细看，点「城」签才入京；去了可用浏览器返回键回原位 */
        var cityB = el('button', 'sj-src gc-go');
        txt(cityB, '城 · ' + g.city);
        cityB.setAttribute('title', '入' + g.city + '卷宗');
        cityB.addEventListener('click', function (e) { e.stopPropagation(); go(); });
        card.appendChild(cityB);
        card.addEventListener('click', function (e) {
          if (e.target.closest && (e.target.closest('.lx') || e.target.closest('.sj-src'))) return;
          card.classList.toggle('sel');
        });
        card.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); card.classList.toggle('sel'); } });
        grid.appendChild(card);
      });
    }
    function addTab(label) {
      var cnt = label === '全部' ? WXGOODS.length : WXGOODS.filter(function (g) { return g.city === label; }).length;
      var ch = el('button', 'chip' + (label === cur ? ' on' : ''));
      ch.setAttribute('data-cat', label);
      txt(ch, label + ' · ' + cnt);
      ch.addEventListener('click', function () {
        cur = label;
        $$('#goodsTabs .chip').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-cat') === label); });
        render(cur);
        persistReading();
      });
      tabs.appendChild(ch);
    }
    addTab('全部');
    WXCITIES.forEach(function (c) { if (!c.blank) addTab(c.name); });
    render(cur);
  }

    /* ---------------- 拾句（谚、令、尾四池合页） ---------------- */
  function buildShiju() {
    txt($('#shijuLead'), '中界的账房没有座右铭，只有递到嘴边的句子。');
    txt($('#shijuPre'), '这页不收字，收的是账的口气：京谚记一京的脾气，岁令记一年的步子，卷尾记每一桩旧事的落点。点京谚，进城看它的起处；点卷尾，回异闻找它的来路；账房谚点一下，盖一枚「抄」印。');
    var say = $('#shijuSay');
    say.innerHTML = '';
    WXSAYINGS.forEach(function (s) {
      var card = el('div', 'shiju-card');
      card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
      txt(card, s);
      /* 源卷：话出自哪卷，点之回卷 */
      var src = null;
      (typeof WXSTORIES !== 'undefined' ? WXSTORIES : []).forEach(function (st) {
        if (!src && (st.sub + st.paras.join('') + st.tail).indexOf(s) >= 0) src = st;
      });
      if (src) {
        var tag = el('button', 'sj-src');
        txt(tag, src.no);
        tag.addEventListener('click', function (e) {
          e.stopPropagation();
          volGo(src.no);
        });
        card.appendChild(tag);
      }
      card.addEventListener('click', function () { card.classList.toggle('copied'); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); card.classList.toggle('copied'); } });
      say.appendChild(card);
    });
    var cy = $('#shijuCity');
    cy.innerHTML = '';
    WXCITYSAYINGS.forEach(function (sy) {
      var p = sy.indexOf('：'), cn = p >= 0 ? sy.slice(0, p) : '', rest = p >= 0 ? sy.slice(p + 1) : sy;
      var c = cityByName(cn);
      var card = el('div', 'shiju-card');
      card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
      card.appendChild(txt(el('span', 'sj-city'), cn));
      card.appendChild(txt(el('span', 'sj-body'), rest));
      function goC() { show('map'); if (c) openCity(c.id); }
      card.addEventListener('click', goC);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); goC(); } });
      cy.appendChild(card);
    });
    var sl = $('#shijuSuiling');
    sl.innerHTML = '';
    WXSUILING.months.forEach(function (mo) {
      var card = el('div', 'shiju-card');
      card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
      card.appendChild(txt(el('span', 'sj-city'), mo.m + ' · ' + mo.name));
      card.appendChild(txt(el('span', 'sj-body'), mo.order));
      card.addEventListener('click', function () { show('suiling'); });
      sl.appendChild(card);
    });
    var tl = $('#shijuTails');
    tl.innerHTML = '';
    WXSTORIES.forEach(function (st) {
      var card = el('div', 'shiju-card tail');
      card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
      card.appendChild(txt(el('span', 'sj-city'), st.no + '《' + st.title + '》'));
      card.appendChild(txt(el('span', 'sj-body'), st.tail));
      card.addEventListener('click', function () { show('stories'); });
      tl.appendChild(card);
    });
  }

  /* 岁令↔异闻共表（模块级）：令卷对照，buildStories 出令引签，buildSuiling 出回卷签 */
  var STORY_LING = {
    s35: ['正月', '开账'], s40: ['二月', '校秤'], s39: ['三月', '对潮'], s36: ['四月', '晒册'],
    s46: ['五月', '收昼'], s44: ['六月', '守芝'], s43: ['七月', '归票'], s37: ['八月', '满期'],
    s38: ['九月', '议息'], s45: ['十月', '巡桩'], s42: ['十一月', '放昼']
  };
  var MO_STORY = {};
  Object.keys(STORY_LING).forEach(function (sid) { MO_STORY[STORY_LING[sid][0]] = sid; });

    /* ---------------- 岁令 ---------------- */
  function buildSuiling() {
    txt($('#suilingLead'), WXSUILING.lead);
    txt($('#suilingPre'), WXSUILING.pre);
    var grid = $('#suilingGrid');
    grid.innerHTML = '';
    WXSUILING.months.forEach(function (mo) {
      var card = el('article', 'suiling-card');
      card.appendChild(txt(el('p', 'kicker'), mo.m));
      card.appendChild(txt(el('h4'), mo.name));
      card.appendChild(txt(el('p', 'order'), mo.order));
      card.appendChild(txt(el('p', 'body'), mo.text));
      /* v1.06.0 是岁有卷：令卡回指其卷（十一令有十一卷，十二月腊月 reserved） */
      var sid = MO_STORY[mo.m];
      var st0 = sid ? WXSTORIES.filter(function (x) { return x.id === sid; })[0] : null;
      if (st0) {
        var vb2 = el('button', 'sj-src ling-chip');
        txt(vb2, '是岁有卷 · ' + st0.no + '《' + st0.title + '》');
        vb2.setAttribute('title', '回该卷');
        vb2.addEventListener('click', function (e) { e.stopPropagation(); volGo(st0.no); });
        card.appendChild(vb2);
      }
      grid.appendChild(card);
    });
    txt($('#suilingTail'), WXSUILING.tail);
  }

  function volumeUiLabel(ref) {
    if (typeof WXSTORIES === 'undefined') return ref;
    var index = WXSTORIES.findIndex(function (story) { return story.no === ref; });
    return index >= 0 ? String(index + 1) : ref;
  }

  /* ---------------- 公门表：按辖属分门，署规与回卷各有位置 ---------------- */
  function buildOrgans() {
    lrBuild();
    var grid = $('#organGrid');
    if (!grid || typeof WXORGANS === 'undefined') return;
    txt($('#organLead'), '十三署分三门：中界中枢不系一京，京署各守其职，灶司在人家门内。看主事与署规，点城入图，点卷回案。');
    grid.addEventListener('click', function (e) {
      var lx = e.target.closest ? e.target.closest('.lx') : null;
      if (lx) lrGo(lx);
    });
    grid.innerHTML = '';
    var groups = [
      { id: 'center', label: '中界中枢', note: '不系一京 · 守总账与墨序', rows: WXORGANS.filter(function (g) { return !g.city && g.n !== '灶'; }) },
      { id: 'city', label: '京署职司', note: '有署有籍 · 各守一项分寸', rows: WXORGANS.filter(function (g) { return !!g.city; }) },
      { id: 'folk', label: '民间香火', note: '家家户户 · 留一格给未到之人', rows: WXORGANS.filter(function (g) { return g.n === '灶'; }) }
    ];
    groups.forEach(function (group) {
      if (!group.rows.length) return;
      var section = el('section', 'organ-section organ-' + group.id);
      var heading = el('header', 'organ-group-head');
      var title = el('div', 'organ-group-title');
      title.appendChild(txt(el('h4'), group.label));
      title.appendChild(txt(el('p'), group.note));
      heading.appendChild(title);
      heading.appendChild(txt(el('span', 'organ-group-count'), String(group.rows.length).padStart(2, '0') + ' 署'));
      section.appendChild(heading);
      var cards = el('div', 'organ-group-grid');
      group.rows.forEach(function (g) {
        var card = el('article', 'organ-card');
        var head = el('header', 'office-head');
        head.appendChild(txt(el('span', 'office-role'), g.role));
        head.appendChild(txt(el('span', 'office-scope'), group.id === 'center' ? '中枢' : group.id === 'folk' ? '民间' : g.city));
        card.appendChild(head);
        card.appendChild(txt(el('h4'), g.n));
        var seat = el('p', 'office-seat');
        seat.appendChild(lrDecorate(g.seat, {}, false));
        card.appendChild(seat);
        var chief = el('div', 'office-detail office-chief');
        chief.appendChild(txt(el('span', 'office-label'), '主事'));
        var chiefText = el('div', 'office-copy'); chiefText.appendChild(lrDecorate(g.head, {}, false)); chief.appendChild(chiefText);
        card.appendChild(chief);
        var rule = el('div', 'office-detail office-rule');
        rule.appendChild(txt(el('span', 'office-label'), '署规'));
        var ruleText = el('div', 'office-copy'); ruleText.appendChild(lrDecorate(g.law, {}, false)); rule.appendChild(ruleText);
        card.appendChild(rule);
        var links = el('footer', 'office-links');
        if (g.city && cityByName(g.city)) {
          var cityButton = el('button', 'office-link office-city');
          cityButton.type = 'button'; txt(cityButton, '入城 · ' + g.city); cityButton.setAttribute('title', '入' + g.city + '卷宗');
          cityButton.addEventListener('click', function () { show('map'); openCity(cityByName(g.city).id); });
          links.appendChild(cityButton);
        }
        (g.ref || '').split('、').forEach(function (ref) {
          if (!ref) return;
          var refButton = el('button', 'office-link office-ref');
          refButton.type = 'button'; txt(refButton, '事见 · ' + volumeUiLabel(ref)); refButton.setAttribute('title', '回到第' + volumeUiLabel(ref) + '卷公案');
          refButton.addEventListener('click', function () { volGo(ref); });
          links.appendChild(refButton);
        });
        card.appendChild(links);
        cards.appendChild(card);
      });
      section.appendChild(cards); grid.appendChild(section);
    });
  }

  /* ---------------- 故纸：原件架分栏，出处、落笔、正文、回卷分层 ---------------- */
  function buildDocs() {
    lrBuild();
    var grid = $('#docGrid');
    if (!grid || typeof WXDOCS === 'undefined') return;
    txt($('#docLead'), '异闻是转述，故纸是原件。这里收契约、告示、簿样与年报：每张纸分列纸种、出处、落笔时刻与原文；边注卷号可回到来处。');
    grid.addEventListener('click', function (e) {
      var lx = e.target.closest ? e.target.closest('.lx') : null;
      if (lx) lrGo(lx);
    });
    grid.innerHTML = '';
    WXDOCS.forEach(function (paper) {
      var card = el('article', 'document-card doc-card');
      var top = el('header', 'dc-top');
      top.appendChild(txt(el('span', 'dc-kind'), paper.kind));
      top.appendChild(txt(el('h4'), paper.n));
      card.appendChild(top);
      var meta = el('div', 'dc-meta');
      var place = el('div', 'dc-meta-item');
      place.appendChild(txt(el('span', 'dc-meta-label'), '出处'));
      place.appendChild(el('p')).appendChild(lrDecorate(paper.seat, {}, false));
      meta.appendChild(place);
      var when = el('div', 'dc-meta-item');
      when.appendChild(txt(el('span', 'dc-meta-label'), '落笔'));
      when.appendChild(txt(el('p'), paper.when));
      meta.appendChild(when);
      card.appendChild(meta);
      var body = el('p', 'dc-text');
      body.appendChild(lrDecorate(paper.text, {}, false));
      card.appendChild(body);
      var refs = el('footer', 'dc-refs');
      refs.appendChild(txt(el('span', 'dc-ref-label'), '勾稽'));
      (paper.ref || '').split('、').forEach(function (ref) {
        if (!ref) return;
        var button = el('button', 'sj-src dc-ref');
        button.type = 'button'; txt(button, '事见 · ' + volumeUiLabel(ref)); button.setAttribute('title', '回到第' + volumeUiLabel(ref) + '卷公案');
        button.addEventListener('click', function () { volGo(ref); });
        refs.appendChild(button);
      });
      card.appendChild(refs);
      grid.appendChild(card);
    });
  }

/* ---------------- 异闻 ---------------- */
  function buildStories() {
    txt($('#pg-stories .sec-title span'), '异闻' + cnNum(WXSTORIES.length) + '则');
    /* 勾稽词表：词库名目（二字以上）+ 人物姓名 + 京名，按长字优先 */
    var lore = {};
    WXLEXICON.forEach(function (x) { if (x.t.length >= 2) lore[x.t] = { k: 'lex' }; });
    WXCHARS.forEach(function (c) { lore[c.name] = { k: 'c', v: c.id }; });
    WXCITIES.forEach(function (c) { lore[c.name] = { k: 'city', v: c.id }; });
    var keys = Object.keys(lore).sort(function (a, b) { return b.length - a.length; });
    var RX = keys.length ? new RegExp('(' + keys.map(function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'g') : null;
    var plain = false;
    /* 卷目滚监：翻到哪卷，卷目上哪卷亮 */
    var spy = null;
    if (typeof IntersectionObserver !== 'undefined') {
      spy = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (!en.isIntersecting) return;
          var no = en.target.getAttribute('data-no');
          $$('#storyTools .tch').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-no') === no); });
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
    }
    /* STORY_PU 已升模块级（v1.13.0 是谱有卷） */
    /* v1.07.0 展线机制已升模块级（ARC_OF/ARCSET/arcFilter 重建式过滤）；卷线签行在此挂载 */
    (function () {
      var row = $('#arcChips');
      if (!row || typeof WXARCS === 'undefined') return;
      row.innerHTML = '';
      row.appendChild(txt(el('span', 'arc-lab'), '卷线十六'));
      WXARCS.forEach(function (a) {
        var c = el('button', 'chip');
        c.setAttribute('data-arc', a.n);
        txt(c, a.n + ' × ' + a.s.length);
        c.setAttribute('title', a.d);
        c.addEventListener('click', function () { arcFilter(a.n); });
        row.appendChild(c);
      });
    })();
    var favs = [];
    try { favs = JSON.parse(localStorage.getItem('wx_favs') || '[]'); } catch (e) {}
    var favLabel = function () {};
    function render() {
      txt($('#storyLead'), plain
        ? '司录处散页，非史非志，姑妄听之。凡异闻皆有一笔「贷方」未写——那是最要紧的。勾稽已旋上墨罩，细读原文。'
        : '司录处散页，非史非志，姑妄听之。凡异闻皆有一笔「贷方」未写——那是最要紧的。字下点金是勾稽：一点入词库、入人物志、入京卷宗。');
      var wrap = $('#storyList');
      wrap.innerHTML = '';
      var shown = WXSTORIES.filter(function (s) {
        return (!WX_CUR_ARC || (ARCSET[WX_CUR_ARC] && ARCSET[WX_CUR_ARC][s.id])) && (!WX_FAV_ONLY || favs.indexOf(s.id) >= 0);
      });
      if (!shown.length) {
        var et = el('div', 'empty-tip');
        et.appendChild(document.createTextNode(WX_FAV_ONLY ? '我架空空的。' : '此线暂无卷。'));
        if (WX_FAV_ONLY) {
          var outBtn = el('button', 'chip');
          outBtn.setAttribute('style', 'margin-left:12px;vertical-align:middle');
          txt(outBtn, '下架 · 回九十八卷里收卷');
          outBtn.addEventListener('click', function () { WX_FAV_ONLY = false; favLabel(); render(); });
          et.appendChild(outBtn);
        }
        wrap.appendChild(et);
      }
      shown.forEach(function (s) {
        var art = el('article', 'story');
        art.setAttribute('data-no', s.no);
        var kickP = el('p', 'kicker');
        kickP.textContent = s.no;
        var favBtn = el('button', 'fav-btn');
        var isFav = favs.indexOf(s.id) >= 0;
        if (isFav) { art.classList.add('fav'); }
        favBtn.textContent = isFav ? '★' : '☆';
        favBtn.setAttribute('title', isFav ? '已收此卷' : '收此卷');
        favBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var idx = favs.indexOf(s.id);
          if (idx >= 0) { favs.splice(idx, 1); art.classList.remove('fav'); }
          else { favs.push(s.id); art.classList.add('fav'); }
          localStorage.setItem('wx_favs', JSON.stringify(favs));
          favBtn.textContent = (favs.indexOf(s.id) >= 0) ? '★' : '☆';
          favBtn.setAttribute('title', (favs.indexOf(s.id) >= 0) ? '已收此卷' : '收此卷');
          favLabel();
          var hc2 = document.querySelector('#homeTally .chip');
          if (hc2) txt(hc2, '我架 · ' + favs.length + ' 卷');
        });
        kickP.appendChild(favBtn);
        art.appendChild(kickP);
        art.appendChild(txt(el('h4'), s.title));
        art.appendChild(txt(el('p', 'sub'), s.sub));
        var body = el('div', 'body');
        var seen = {};
        function decorate(text) {
          if (plain || !RX) return document.createTextNode(text);
          RX.lastIndex = 0;
          var frag = document.createDocumentFragment();
          var last = 0; var m;
          while ((m = RX.exec(text))) {
            var w = m[1];
            if (seen[w]) continue;
            seen[w] = true;
            frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            var sp = el('span', 'lx');
            var info = lore[w];
            sp.setAttribute('data-k', info.k);
            if (info.v) sp.setAttribute('data-v', info.v);
            txt(sp, w);
            frag.appendChild(sp);
            last = m.index + w.length;
          }
          if (!frag.childNodes.length) return document.createTextNode(text);
          frag.appendChild(document.createTextNode(text.slice(last)));
          return frag;
        }
        s.paras.forEach(function (p) {
          var pa = el('p');
          pa.appendChild(decorate(p));
          body.appendChild(pa);
        });
        art.appendChild(body);
        art.appendChild(txt(el('p', 'tail'), s.tail));
        /* 令引：岁令之卷，点签直达岁令页 */
        var ling = STORY_LING[s.id];
        if (ling) {
          var lb = el('button', 'sj-src ling-chip');
          txt(lb, '岁令 · ' + ling[0] + ling[1]);
          lb.setAttribute('title', '点之至岁令页');
          lb.addEventListener('click', function () { show('suiling'); });
          art.appendChild(lb);
        }
        /* 谱签：众生之卷，点签入众生谱 */
        var pu = STORY_PU[s.id];
        if (pu) {
          var pb = el('button', 'sj-src ling-chip');
          txt(pb, '谱 · ' + pu.n);
          pb.setAttribute('title', '点之至众生谱');
          pb.addEventListener('click', function () { show('beings'); });
          art.appendChild(pb);
        }
        /* 线签：点线，只展这条线的卷 */
        (ARC_OF[s.id] || []).forEach(function (an) {
          var ab = el('button', 'sj-src ling-chip');
          txt(ab, '线 · ' + an);
          ab.setAttribute('title', '只展这条线的卷');
          ab.addEventListener('click', function () { arcFilter(an); });
          art.appendChild(ab);
        });
        /* 有账人物：卷中出现谁，谁就点得到 */
        var charsHere = (typeof WXCHARS !== 'undefined' ? WXCHARS : []).filter(function (c) {
          return c.name.length > 1 && (s.sub + s.paras.join('') + s.tail).indexOf(c.name) >= 0;
        }).slice(0, 8);
        if (charsHere.length) {
          var row = el('p', 'mention-row');
          row.appendChild(txt(el('span', 'mr-hd'), '有账人物'));
          charsHere.forEach(function (c2) {
            var b2 = el('button', 'chip tch-c');
            txt(b2, c2.name);
            b2.addEventListener('click', function () { focusChar(c2.id); });
            row.appendChild(b2);
          });
          art.appendChild(row);
        }
        wrap.appendChild(art);
      });
      if (spy) {
        shown.forEach(function (s2) {
          var el3 = document.querySelector('#storyList article[data-no="' + s2.no + '"]');
          if (el3) spy.observe(el3);
        });
      }
    }
    var tools = $('#storyTools');
    if (tools) {
      tools.innerHTML = '';
      var tg = el('button', 'chip on');
      txt(tg, '勾稽 · 开');
      tg.addEventListener('click', function () {
        plain = !plain;
        tg.classList.toggle('on', !plain);
        txt(tg, '勾稽 · ' + (plain ? '关' : '开'));
        render();
      });
      tools.appendChild(tg);
      /* v1.09.0 我架：收卷功能的上架——只看收过的卷，与展线可叠加 */
      var fv = el('button', 'chip');
      favLabel = function () {
        txt(fv, '我架 · ' + favs.length + ' 卷');
        fv.classList.toggle('on', WX_FAV_ONLY);
      };
      favLabelRefresh = favLabel;
      favLabel();
      fv.setAttribute('title', '只看收进我架的卷');
      fv.addEventListener('click', function () {
        WX_FAV_ONLY = !WX_FAV_ONLY;
        favLabel();
        render();
      });
      tools.appendChild(fv);
      WXSTORIES.forEach(function (s) {
        var ch = el('button', 'chip tch');
        ch.setAttribute('data-no', s.no);
        txt(ch, s.no);
        ch.addEventListener('click', function () {
          if (WX_CUR_ARC && !ARCSET[WX_CUR_ARC][s.id]) arcClear();
          var art = document.querySelector('#storyList article[data-no="' + s.no + '"]');
          if (!art) return;
          $$('#storyTools .tch').forEach(function (x) { x.classList.toggle('on', x === ch); });
          art.scrollIntoView({ behavior: 'smooth', block: 'start' });
          art.classList.add('story-flash');
          setTimeout(function () { art.classList.remove('story-flash'); }, 2400);
        });
        tools.appendChild(ch);
      });
    }
    var wrap2 = $('#storyList');
    wrap2.addEventListener('click', function (e) {
      var lx = e.target.closest ? e.target.closest('.lx') : null;
      if (!lx) return;
      var k = lx.getAttribute('data-k');
      if (k === 'c') { focusChar(lx.getAttribute('data-v')); return; }
      if (k === 'city') { show('map'); openCity(lx.getAttribute('data-v')); return; }
      show('lexicon');
      var ip = $('#lexSearch');
      if (ip) { ip.value = lx.textContent; ip.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    STORY_RENDER = render;
    render();
  }

  /* ---------------- 更新志 + 溯源 ---------------- */
  function buildUpdates() {
    var wrap = $('#updList');
    wrap.innerHTML = '';
    WXUPDATES.forEach(function (u, i) {
      /* v1.17.0 归档：一百余版全摊是墙，折成档册——首档开，点牌展一版 */
      var card = el('details', 'upd');
      var h = el('summary', 'u-head');
      h.appendChild(txt(el('span', 'v'), u.v));
      h.appendChild(txt(el('span', 'date'), u.date));
      h.appendChild(txt(el('span', 'title'), u.title));
      card.appendChild(h);
      var ul = el('ul');
      u.items.forEach(function (it) { ul.appendChild(txt(el('li'), it)); });
      card.appendChild(ul);
      if (i === 0) card.open = true;
      wrap.appendChild(card);
    });
    /* v1.18.0 更新志里的卷号也是活字 */
    linkVolumes(wrap);
    var tr = $('#traceList');
    tr.innerHTML = '';
    WXTRACE.forEach(function (t) {
      var row = el('div', 'tr'), source = el('div', 'src');
      if (t.url) {
        var link = el('a', 'source-link');
        txt(link, t.src + ' ↗'); link.href = t.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        source.appendChild(link);
      } else txt(source, t.src);
      row.appendChild(source);
      row.appendChild(txt(el('div', 'take'), t.take));
      tr.appendChild(row);
    });
    txt($('#traceNote'), WXNOTE);
  }

  /* ---------------- 人物志：索引不增高，详传入弹窗 ---------------- */
  var CHARCATS = ['塔主', '公门', '修士', '邪路', '异闻'];
  function buildCharacters() {
    lrBuild();
    var tabs = $('#charTabs');
    var grid = $('#charGrid');
    var dialog = $('#characterDialog');
    var dialogContent = $('#characterDialogContent');
    var portraitDialog = $('#portraitDialog');
    var portraitImage = $('#portraitViewerImage');
    var portraitCaption = $('#portraitViewerCaption');
    var COL = { '塔主': 'c0', '公门': 'c1', '修士': 'c2', '异物': 'c3', '邪路': 'c4', '异闻': 'c5' };
    var cur = CHARCATS.indexOf(CHAR_FILTER) >= 0 ? CHAR_FILTER : '全部';
    CHAR_FILTER = cur;

    function imageUrl(c) { return c.portrait ? new URL(c.portrait, document.baseURI).href : ''; }
    function openPortrait(c) {
      if (!c || !c.portrait || !portraitDialog || !portraitImage) return;
      portraitImage.src = imageUrl(c);
      portraitImage.alt = c.name + ' · ' + c.title;
      txt(portraitCaption, c.name + ' · ' + c.title);
      if (portraitDialog.showModal) portraitDialog.showModal();
    }
    function openProfile(id) {
      var c = WXCHARS.filter(function (item) { return item.id === id; })[0];
      if (!c || !dialog || !dialogContent) return;
      dialogContent.innerHTML = '';
      var panel = el('article', 'character-profile' + (c.portrait ? ' has-portrait' : ''));
      if (c.portrait) panel.style.setProperty('--char-bg', 'url("' + imageUrl(c) + '")');
      var head = el('header', 'character-profile-heading');
      var title = txt(el('h2'), c.name); title.id = 'characterDialogTitle';
      head.appendChild(title);
      head.appendChild(txt(el('p', 'profile-title'), c.title));
      var meta = el('div', 'character-profile-meta');
      meta.appendChild(txt(el('span'), c.place));
      meta.appendChild(txt(el('span', 'chip ' + (COL[c.cat] || 'c2')), c.cat));
      var degree = WXRELATIONS.links.reduce(function (n, link) { return n + (link.s === c.id || link.t === c.id ? 1 : 0); }, 0);
      meta.appendChild(txt(el('span'), degree ? '牵 ' + cnNum(degree) + ' 线' : '账外留白'));
      head.appendChild(meta);
      panel.appendChild(head);

      var body = el('div', 'character-profile-body');
      var biography = el('p', 'character-profile-text text');
      biography.appendChild(lrDecorate(c.text, {}, false));
      body.appendChild(biography);
      var hook = el('div', 'being-hook');
      hook.appendChild(txt(el('b'), '账缝'));
      hook.appendChild(txt(el('span'), c.hook));
      body.appendChild(hook);
      var actions = el('div', 'char-actions profile-actions');
      var relation = el('button', 'char-network-link');
      relation.type = 'button'; relation.setAttribute('data-character-network', c.id);
      txt(relation, '看关系网 ↗'); actions.appendChild(relation);
      if (c.portrait) {
        var zoom = el('button', 'char-network-link char-portrait-open');
        zoom.type = 'button'; zoom.setAttribute('data-portrait-open', c.id);
        txt(zoom, '全屏看像 ⤢'); actions.appendChild(zoom);
      }
      actions.appendChild(txt(el('span', 'origin'), '出 · ' + c.origin));
      body.appendChild(actions);
      panel.appendChild(body);
      dialogContent.appendChild(panel);
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    }

    txt($('#charsLead'), cnNum(WXCHARS.length) + ' 人，' + cnNum(WXCHARS.filter(function (c) { return c.cat === '塔主'; }).length) + ' 塔主。点人物看详传；传中可另入关系网，画像可全屏细观。');
    grid.addEventListener('click', function (e) {
      var profile = e.target.closest ? e.target.closest('[data-character-profile]') : null;
      if (profile) { openProfile(profile.getAttribute('data-character-profile')); return; }
      var lx = e.target.closest ? e.target.closest('.lx') : null;
      if (lx) lrGo(lx);
    });
    if (dialog) {
      dialog.addEventListener('click', function (e) {
        var network = e.target.closest ? e.target.closest('[data-character-network]') : null;
        if (network) {
          var personId = network.getAttribute('data-character-network');
          dialog.close(); show('network');
          if (PAGE_HOOKS.network) PAGE_HOOKS.network(personId);
          return;
        }
        var zoom = e.target.closest ? e.target.closest('[data-portrait-open]') : null;
        if (zoom) { openPortrait(WXCHARS.filter(function (c) { return c.id === zoom.getAttribute('data-portrait-open'); })[0]); return; }
        var lx = e.target.closest ? e.target.closest('.lx') : null;
        if (lx) lrGo(lx);
        if (e.target === dialog) dialog.close();
      });
      var close = $('#characterDialogClose');
      if (close) close.addEventListener('click', function () { dialog.close(); });
    }
    if (portraitDialog) {
      var closePortrait = $('#portraitDialogClose');
      if (closePortrait) closePortrait.addEventListener('click', function () { portraitDialog.close(); });
      portraitDialog.addEventListener('click', function (e) { if (e.target === portraitDialog) portraitDialog.close(); });
    }

    function render(cat) {
      grid.innerHTML = '';
      var list = WXCHARS.filter(function (c) { return cat === '全部' || c.cat === cat; });
      if (!list.length) {
        var tip = el('div', 'empty-tip'); txt(tip, '此门尚无立传之人。'); grid.appendChild(tip); return;
      }
      var DEG = {};
      WXRELATIONS.links.forEach(function (l) { DEG[l.s] = (DEG[l.s] || 0) + 1; DEG[l.t] = (DEG[l.t] || 0) + 1; });
      list.forEach(function (c) {
        var card = el('article', 'being char-card' + (c.portrait ? ' has-portrait' : ''));
        card.setAttribute('data-id', c.id);
        if (c.portrait) card.style.setProperty('--char-bg', 'url("' + imageUrl(c) + '")');
        var summary = el('button', 'char-summary');
        summary.type = 'button'; summary.setAttribute('data-character-profile', c.id);
        summary.setAttribute('aria-haspopup', 'dialog'); summary.setAttribute('aria-controls', 'characterDialog');
        summary.setAttribute('aria-label', '打开' + c.name + '的人物详传');
        var info = el('div', 'char-summary-info');
        var top = el('div', 'being-top');
        top.appendChild(txt(el('h4'), c.name)); top.appendChild(txt(el('span', 'also'), c.title)); info.appendChild(top);
        var meta = el('div', 'char-summary-meta');
        meta.appendChild(txt(el('span', 'place'), c.place));
        meta.appendChild(txt(el('span', 'chip ' + (COL[c.cat] || 'c2')), c.cat));
        meta.appendChild(txt(el('span', 'net-deg'), DEG[c.id] ? '牵 ' + cnNum(DEG[c.id]) + ' 线' : '账外留白'));
        info.appendChild(meta); info.appendChild(txt(el('p', 'char-peek'), c.temper));
        summary.appendChild(info); card.appendChild(summary); grid.appendChild(card);
      });
    }
    function addTab(label) {
      var cnt = label === '全部' ? WXCHARS.length : WXCHARS.filter(function (c) { return c.cat === label; }).length;
      var chip = el('button', 'chip' + (label === cur ? ' on' : ''));
      chip.setAttribute('data-cat', label); chip.setAttribute('aria-pressed', label === cur ? 'true' : 'false');
      txt(chip, label + ' · ' + cnt);
      chip.addEventListener('click', function () {
        cur = label; CHAR_FILTER = label;
        $$('#charTabs .chip').forEach(function (x) {
          var selected = x.getAttribute('data-cat') === label;
          x.classList.toggle('on', selected); x.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        render(cur); persistReading();
      });
      tabs.appendChild(chip);
    }
    tabs.innerHTML = '';
    addTab('全部'); CHARCATS.forEach(addTab); render(cur);
  }

  /* ---------------- 落账判语（五问验算） ---------------- */
  function buildJudge() {
    var qi = 0;
    var PROV = ['牛皮吹破天，账上见真章。', '既不敢上秤，何必称重。', '查无可查者，皆是虚账。', '有借必有贷，借贷必相等。'];
    var SCOPES = [
      { re: /多元|无限盒子|诸天万界|维度|次元/, out: true, wb: '多元级', lv: '' },
      { re: /宇宙/, out: true, wb: '宇宙结构级', lv: '' },
      { re: /星系|星河/, out: true, wb: '星系级', lv: '' },
      { re: /恒星|太阳|烈日/, out: false, wb: '爆恒星级', lv: '抚宁' },
      { re: /星|行星|月球/, out: false, wb: '爆星级', lv: '抚宁' },
      { re: /大陆|洲|地表/, out: false, wb: '爆大陆级', lv: '平章' },
      { re: /国|山|海|湖/, out: false, wb: '爆国级', lv: '柱国' },
      { re: /城/, out: false, wb: '爆城级', lv: '柱国' },
      { re: /街|坊|村|镇/, out: false, wb: '爆街级', lv: '把总' },
      { re: /楼|屋|房|人|树|墙/, out: false, wb: '爆楼级', lv: '掌笔' }
    ];
    var HOLLOW = [
      { re: /无尽/, note: '无尽而无疆界者，账上立不住（第二问）。' },
      { re: /无限/, note: '无限即无底，无底即无账（第三问）。' },
      { re: /无穷/, note: '穷与不尽，皆非计量之词（第三问）。' },
      { re: /万法不侵/, note: '不侵者先自证其贷方（第一问）。' },
      { re: /取之不竭|永不枯竭/, note: '拒核余力者，虚账无疑（第四问）。' },
      { re: /无敌|不可战胜|绝对/, note: '天外有天，账上有账（第五问）。' },
      { re: /死|亡|写活|还魂|起死/, note: '与生死对账，须白面同行——自写生死，视同改账（第三律）。' },
      { re: /天机|不可说|泄|泄露/, note: '天机不是不能说，是说了要缴税——说破须缴泄账税（问天，先问税）。' }
    ];
    var samples = ['我一拳能打爆整座城', '我法力无尽，万法不侵', '我能用眼神熄灭太阳', '我记的账，比石头还实', '我能把一页账抄进亡人心里', '我一觉睡了十二年，要讨回来', '我存的昼，能借人三刻', '我跑遍了整条江', '我不欠任何人的账'];
    function runJudge(claim) {
      var box = $('#judgeOut');
      var c = (claim || '').trim();
      if (!c) {
        box.innerHTML = '<p class="judge-idle">衙前秤闲。写一句，称一称。</p>';
        return;
      }
      var q = WXCORE.falsify.qs[qi % WXCORE.falsify.qs.length];
      qi++;
      var hw = [];
      HOLLOW.forEach(function (h) { if (h.re.test(c)) hw.push(h.note); });
      var sc = null;
      SCOPES.forEach(function (s) { if (!sc && s.re.test(c)) sc = s; });
      var head = el('p', 'j-head'); txt(head, '本日值问 · ' + q.q + '　——　' + q.a);
      var cl = el('p', 'j-claim'); txt(cl, '宣称：「' + c + '」');
      var vd = el('div', 'j-verdict');
      var pv = el('p', 'j-note j-prov'); txt(pv, '账房曰：' + PROV[qi % PROV.length]);
      box.innerHTML = '';
      box.appendChild(head);
      box.appendChild(cl);
      if (hw.length) {
        vd.className = 'j-verdict j-hollow';
        if (sc && sc.out) {
          txt(vd, '判语：虚账，且为界外宣称。基数不实，落档免谈；坊间或呼【' + sc.wb + '】。');
        } else {
          txt(vd, '判语：虚账。先按最低可证之档【掌笔】入账，能证之数为账，不能证之数为虚；年结时按虚额加倍冲销。');
        }
        var li = el('ul', 'j-notes');
        hw.forEach(function (n) { li.appendChild(txt(el('li'), '勾　' + n)); });
        box.appendChild(vd);
        box.appendChild(li);
      } else if (!sc) {
        vd.className = 'j-verdict j-dim';
        txt(vd, '判语：落不了档。既无范围，便无账可记——天上有云，地上无雨，此秤不收云。');
        box.appendChild(vd);
      } else if (sc.out) {
        vd.className = 'j-verdict j-void';
        txt(vd, '判语：界外宣称。墨序账页之外另有海——鉴真司不落账、不冲销、亦不受理。坊间或呼之【' + sc.wb + '】。');
        box.appendChild(vd);
      } else {
        vd.className = 'j-verdict j-ok';
        vd.appendChild(document.createTextNode('判语：可上账。坊间口径约【' + sc.wb + '】，本界九阶拟落【'));
        var lvb = el('button', 'lv-jump');
        txt(lvb, sc.lv);
        lvb.setAttribute('title', '点之看这一阶的牌');
        lvb.addEventListener('click', function () {
          var hit = null;
          $$('.lv').forEach(function (c) { if (!hit && c.textContent.indexOf(sc.lv) >= 0) hit = c; });
          if (!hit) return;
          hit.classList.add('lv-flash');
          hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { hit.classList.remove('lv-flash'); }, 2600);
        });
        vd.appendChild(lvb);
        vd.appendChild(document.createTextNode('】档——但须出示贷方；查无可查，仍作虚账。'));
        box.appendChild(vd);
      }
      box.appendChild(pv);
    }
    var holder = $('#judgeSamples');
    samples.forEach(function (s) {
      var b = el('button', 'chip');
      txt(b, s);
      b.addEventListener('click', function () {
        var inp = $('#judgeInput');
        inp.value = s;
        runJudge(s);
      });
      holder.appendChild(b);
    });
    $('#judgeGo').addEventListener('click', function () { runJudge($('#judgeInput').value); });
    $('#judgeInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') runJudge(e.target.value); });
  }

  /* ---------------- 账期旬位（顶栏） ---------------- */
  function cnN(n) {
    var c = '一二三四五六七八九十';
    return (n >= 1 && n <= 10) ? c[n - 1] : String(n);
  }
  function buildEra() {
    var badge = $('#eraBadge');
    if (!WXTIMELINE || !WXTIMELINE.eraZero) return;
    var t0 = new Date(WXTIMELINE.eraZero.replace(/-/g, '/') + ' 00:00:00');
    var days = Math.max(0, Math.floor((Date.now() - t0.getTime()) / 86400000));
    var er = Math.floor(days / 365.25);
    var yearNo = WXTIMELINE.eraBase + er;
    var dayIn = days - Math.floor(er * 365.25);
    var xi = Math.min(11, Math.floor(dayIn / 30.42));
    var dayX = Math.floor(dayIn - xi * 30.42) + 1;
    var left = Math.ceil(365.25 - (dayIn + 1));
    badge.innerHTML = '<i></i>　第' + cnN(yearNo) + '账期 · ' + WXTIMELINE.xun[xi] + ' · 第' + dayX + '日　·　距年结 ' + left + ' 日　·　岁名「' + suiName(yearNo).nm + '」';
  }

  /* ---------------- 甲子账牌（岁名六十面） ---------------- */
  function suiName(yearNo) {
    var i = (yearNo - 1) % 60;
    return { nm: WXTIMELINE.gans[i % 10] + WXTIMELINE.zhis[i % 12], i: i };
  }
  function buildJiazi() {
    var box = $('#jiaziBox');
    if (!box || !WXTIMELINE.gans) return;
    txt($('#jiaziLead'), WXTIMELINE.jiazi + '　' + WXTIMELINE.ganDe + '　' + WXTIMELINE.zhiShuo);
    box.innerHTML = '';
    var t0 = new Date(WXTIMELINE.eraZero.replace(/-/g, '/') + ' 00:00:00');
    var er = Math.floor(Math.max(0, Math.floor((Date.now() - t0.getTime()) / 86400000)) / 365.25);
    var now = suiName(WXTIMELINE.eraBase + er);
    for (var i = 0; i < 60; i++) {
      var tile = el('span', 'jz-tile' + (i === now.i ? ' now' : ''));
      tile.appendChild(txt(el('em'), '第' + (i + 1) + '面'));
      tile.appendChild(document.createTextNode(' ' + WXTIMELINE.gans[i % 10] + WXTIMELINE.zhis[i % 12]));
      /* v1.18.0 支即京：点岁牌入该京卷宗 */
      var zi = WXTIMELINE.zhis[i % 12];
      tile.setAttribute('title', (i === now.i ? '今岁行此牌 · ' : '') + '支京：' + zi + '京——点此面入该京卷宗');
      tile.setAttribute('role', 'button');
      tile.addEventListener('click', function () {
        var zj = this.getAttribute('data-zhi');
        var c2 = (typeof WXCITIES !== 'undefined' ? WXCITIES : []).filter(function (c) { return c.name === zj + '京'; })[0];
        if (c2) { show('map'); openCity(c2.id); }
      });
      tile.setAttribute('data-zhi', zi);
      box.appendChild(tile);
    }
  }

  /* ---------------- 四柱清册 ---------------- */
  function buildFour() {
    var box = $('#fourBox');
    if (!box || typeof WXFOUR === 'undefined') return;
    $('#fourIntro').appendChild(txt(el('span'), WXFOUR.intro + '　——　' + WXFOUR.formula));
    var fm = el('div', 'four-form');
    var inputs = [];
    ['旧管', '新收', '开除'].forEach(function (n, i) {
      var cell = el('label', 'four-cell');
      cell.appendChild(txt(el('span'), n));
      var inp = document.createElement('input');
      inp.type = 'number'; inp.value = i === 0 ? 100 : (i === 1 ? 30 : 0); inp.min = '0';
      cell.appendChild(inp);
      inputs.push(inp);
      fm.appendChild(cell);
    });
    box.appendChild(fm);
    var out = el('div', 'four-out');
    box.appendChild(out);
    function calc() {
      var v = inputs.map(function (x) { return Number(x.value) || 0; });
      var sz = v[0] + v[1] - v[2];
      out.innerHTML = '';
      var c = el('div', 'j-claim');
      c.appendChild(txt(el('span'), '旧管 ' + v[0] + ' ＋ 新收 ' + v[1] + ' － 开除 ' + v[2] + ' ＝ 实在 ' + sz));
      out.appendChild(c);
      var vd = el('div', 'j-verdict');
      if (sz < 0) {
        vd.className += ' j-hollow';
        vd.appendChild(txt(el('span'), '判语：四柱不平。实在为负 ' + sz + '，此账透支——透支之数，年结加息偿还。'));
      } else if (sz === 0) {
        vd.className += ' j-ok';
        vd.appendChild(txt(el('span'), '判语：四柱归零。两手空空，一尘不染——给出去的才是我的。'));
      } else {
        vd.className += ' j-ok';
        vd.appendChild(txt(el('span'), '判语：四柱平。实在 ' + sz + '，暂存于世。记住：实在只是「还没划走」。'));
      }
      out.appendChild(vd);
      var nt = el('div', 'j-notes');
      nt.appendChild(txt(el('span'), WXFOUR.life));
      out.appendChild(nt);
    }
    inputs.forEach(function (x) { x.addEventListener('input', calc); });
    calc();
    var lm = el('div', 'longmen-box');
    var lh = el('div', 'c-head');
    lh.appendChild(txt(el('span'), '合龙门 · ' + WXFOUR.longmen.formula));
    lm.appendChild(lh);
    var lt = el('p', 'c-sub');
    lt.appendChild(txt(el('span'), WXFOUR.longmen.text));
    lm.appendChild(lt);
    var ln = el('div', 'j-notes');
    ln.appendChild(txt(el('span'), WXFOUR.longmen.note));
    lm.appendChild(ln);
    box.appendChild(lm);
  }

  /* ---------------- 流水簿（页脚格言轮播） ---------------- */
  function ticker() {
    var host = $('#ticker');
    var pools = [];
    pools.push(function () {
      var x = WXLEXICON[Math.floor(Math.random() * WXLEXICON.length)];
      return '『 ' + x.t + ' 』　' + x.d;
    });
    if (typeof WXSAYINGS !== 'undefined' && WXSAYINGS.length) pools.push(function () {
      return '谚　' + WXSAYINGS[Math.floor(Math.random() * WXSAYINGS.length)];
    });
    if (typeof WXCITYSAYINGS !== 'undefined' && WXCITYSAYINGS.length) pools.push(function () {
      return '京谚　' + WXCITYSAYINGS[Math.floor(Math.random() * WXCITYSAYINGS.length)];
    });
    function once() {
      var line = pools[(once.n = (once.n || 0) + 1) % pools.length]();
      if (line.length > 68) line = line.slice(0, 68) + '……';
      host.style.opacity = '0';
      setTimeout(function () {
        txt(host, line);
        host.style.opacity = '1';
      }, 420);
    }
    once();
    setInterval(once, 5200);
  }

  /* ---------------- 关系网 ---------------- */
  /* 门类配色沿用全站 c0~c5；键为 relations.js 里的 g 值 */
  var NET_GROUP_CLS = { '塔主': 'c0', '公门': 'c1', '修士': 'c5', '异物': 'c2', '邪路': 'c3', '异闻': 'c4' };
  var NET_NS = 'http://www.w3.org/2000/svg';
  var NET_R = 34;

  function buildNetwork() {
    var lead = $('#networkLead');
    var svg = $('#netSvg');
    var detail = $('#netDetail');
    var legend = $('#netLegend');
    if (!lead || !svg || !detail || !legend) return;
    txt(lead, '人名册' + cnNum(WXRELATIONS.nodes.length) + '，各归其京。此图坐标与天地图同一算位，两图可对读：人在哪一京，图上便在哪一格。'
      + '实线为「同场」——传记或异闻里确实同处一事；虚线为「同题」——只共执一念，未必谋过面。'
      + '点人看其牵连，点线看那笔分录。');
    svg.innerHTML = '';
    legend.innerHTML = '';

    function setAttrs(n, o) { for (var k in o) { if (o.hasOwnProperty(k)) n.setAttribute(k, o[k]); } return n; }

    /* 箭头 */
    var defs = setAttrs(elNS('defs', NET_NS), {});
    [['netAr', '#8a7e66'], ['netArOn', '#e0674f']].forEach(function (p) {
      var mk = setAttrs(elNS('marker', NET_NS), {
        id: p[0], markerWidth: 9, markerHeight: 9, refX: 7, refY: 3, orient: 'auto', markerUnits: 'userSpaceOnUse'
      });
      mk.appendChild(setAttrs(elNS('path', NET_NS), { d: 'M0,0 L0,6 L8,3 z', fill: p[1] }));
      defs.appendChild(mk);
    });
    svg.appendChild(defs);

    /* 底图：与天地图同一段纸、同一算位，两图可对读 */
    var back = elNS('g', NET_NS);
    back.setAttribute('class', 'net-back');
    [['M52,42 L456,34 L456,688 L52,698 Z', '阴　页', 254],
     ['M544,34 L948,42 L948,698 L544,688 Z', '阳　页', 746]].forEach(function (pg) {
      back.appendChild(setAttrs(elNS('path', NET_NS), { d: pg[0], 'class': 'net-pg' }));
      var t = setAttrs(elNS('text', NET_NS), { x: pg[2], y: 78, 'text-anchor': 'middle', 'class': 'net-page' });
      t.textContent = pg[1];
      back.appendChild(t);
    });
    back.appendChild(setAttrs(elNS('rect', NET_NS), { x: 456, y: 30, width: 88, height: 666, 'class': 'net-spine-box' }));
    svg.appendChild(back);

    var byId = {};
    WXRELATIONS.nodes.forEach(function (n) { byId[n.id] = n; });
    /* v1.04.0 节点入画：超出图框者（如桩外的雾中人、账外的许留白）拉回框内——图上不许藏人 */
    WXRELATIONS.nodes.forEach(function (n) {
      n.x = Math.max(84, Math.min(916, n.x));
      n.y = Math.max(96, Math.min(628, n.y));
    });

    var linkEls = [];
    var nodeEls = {};
    var current = null;

    function paint(id) {
      Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.toggle('hl', k === id); });
      linkEls.forEach(function (o) { o.g.classList.toggle('hl', !!id && (o.l.s === id || o.l.t === id)); });
    }

    function showNone() {
      detail.innerHTML = '';
      var h = el('div', 'nd-head');
      h.appendChild(txt(el('h4'), '未展开'));
      detail.appendChild(h);
      detail.appendChild(txt(el('p', 'dim'), '点左侧一名人，看他在谁账上；点一线，看那一笔的分录。'));
    }

    /* 人物志显式点「看关系网」后聚焦其人；网上无名者示「留白」 */
    PAGE_HOOKS.network = function (id) {
      var n = byId[id];
      if (n) { showNode(n); return; }
      current = null; paint(null);
      detail.innerHTML = '';
      var h = el('div', 'nd-head');
      h.appendChild(txt(el('h4'), '留白'));
      detail.appendChild(h);
      detail.appendChild(txt(el('p', 'dim'), '此人在关系网上无名——名下无笔，账外之人。留白不是罪状，是不与人相欠。'));
    };

    function showNode(n) {
      current = n.id; paint(n.id);
      detail.innerHTML = '';
      var head = el('div', 'nd-head');
      head.appendChild(txt(el('h4'), n.name));
      head.appendChild(txt(el('span', 'nd-tag ' + (NET_GROUP_CLS[n.g] || 'c2')), n.g));
      detail.appendChild(head);
      var ch = null;
      for (var i = 0; i < WXCHARS.length; i++) { if (WXCHARS[i].id === n.id) { ch = WXCHARS[i]; break; } }
      if (ch) {
        detail.appendChild(txt(el('p', 'nd-meta'), ch.title + ' · ' + ch.place));
      }
      var act = el('div', 'cd-links');
      var bC = el('button', 'chip');
      txt(bC, '开人物志');
      bC.addEventListener('click', function () { focusChar(n.id); });
      act.appendChild(bC);
      detail.appendChild(act);
      var mine = WXRELATIONS.links.filter(function (l) { return l.s === n.id || l.t === n.id; });
      if (!mine.length) { detail.appendChild(txt(el('p', 'dim'), '此人账上干净，不与旁人相欠 —— 孤账一笔记着。')); return; }
      var ul = el('ul', 'net-links');
      mine.forEach(function (l) {
        var other = byId[l.s === n.id ? l.t : l.s];
        if (!other) return;
        var li = el('li', l.kind === '同题' ? 'soft' : '');
        li.appendChild(el('span', 'nl-kind ' + (NET_GROUP_CLS[other.g] || 'c2'), l.kind + ' · ' + l.type));
        li.appendChild(txt(el('b'), other.name));
        li.appendChild(txt(el('span', 'nl-note'), l.note));
        ul.appendChild(li);
      });
      detail.appendChild(ul);
    }

    function showLink(l) {
      current = null; paint(null);
      detail.innerHTML = '';
      var s = byId[l.s], t = byId[l.t];
      var head = el('div', 'nd-head');
      head.appendChild(txt(el('h4'), (s ? s.name : l.s) + ' ' + (l.kind === '同题' ? '···' : '→') + ' ' + (t ? t.name : l.t)));
      head.appendChild(txt(el('span', 'nd-tag'), l.kind + ' · ' + l.type));
      detail.appendChild(head);
      detail.appendChild(txt(el('p'), l.note));
    }

    /* 弧线路由：人钉本京算位不动，线在若干弯曲度中挑首个不穿他人圆的走法 */
    function curveAt(rt, k) {
      var u = 1 - k;
      return { x: u * u * rt.p1.x + 2 * u * k * rt.c.x + k * k * rt.p2.x,
               y: u * u * rt.p1.y + 2 * u * k * rt.c.y + k * k * rt.p2.y };
    }
    function routeTo(s2, t2, bend) {
      var mx = (s2.x + t2.x) / 2, my = (s2.y + t2.y) / 2;
      var dx = t2.x - s2.x, dy = t2.y - s2.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var c = { x: mx - dy / len * bend, y: my + dx / len * bend };
      var a0 = Math.atan2(c.y - s2.y, c.x - s2.x), a1 = Math.atan2(c.y - t2.y, c.x - t2.x);
      return { c: c, p1: { x: s2.x + Math.cos(a0) * NET_R, y: s2.y + Math.sin(a0) * NET_R },
               p2: { x: t2.x + Math.cos(a1) * (NET_R + 9), y: t2.y + Math.sin(a1) * (NET_R + 9) } };
    }
    function pathClear(rt, others) {
      for (var k = 0; k <= 24; k++) {
        var p = curveAt(rt, k / 24);
        if (p.x < 60 || p.x > 940 || p.y < 46 || p.y > 700) return false;
        for (var j = 0; j < others.length; j++) {
          if (Math.hypot(p.x - others[j].x, p.y - others[j].y) < NET_R + 5) return false;
        }
      }
      return true;
    }
    /* 弯度候选：按绝对值递增依次试放；240 一档不可省——铁无明—梅不扫那条走廊只有 ±240 能过。
       全部不通过时按「最小净空最大」回退，绝不回退成穿节点的直线。 */
    var BENDS = [0, 30, -30, 62, -62, 100, -100, 145, -145, 200, -200, 240, -240, 260, -260, 320, -320];
    var occupied = [];

    function minClear(rt, others) {
      var mn = 1e9;
      for (var k = 0; k <= 24; k++) {
        var p = curveAt(rt, k / 24);
        if (p.x < 60 || p.x > 940 || p.y < 46 || p.y > 700) return -1e9;
        for (var j = 0; j < others.length; j++) {
          var dd = Math.hypot(p.x - others[j].x, p.y - others[j].y);
          if (dd < mn) mn = dd;
        }
      }
      return mn;
    }

    WXRELATIONS.links.forEach(function (l) {
      var s = byId[l.s], t = byId[l.t];
      if (!s || !t) return;
      var others = WXRELATIONS.nodes.filter(function (n) { return n.id !== l.s && n.id !== l.t; });
      var rt = null, bi;
      for (bi = 0; bi < BENDS.length; bi++) {
        var trial = routeTo(s, t, BENDS[bi]);
        if (pathClear(trial, others)) { rt = trial; break; }
      }
      if (!rt) {
        var best = null, bestMn = -1e9;
        for (bi = 0; bi < BENDS.length; bi++) {
          var tri2 = routeTo(s, t, BENDS[bi]);
          var m2 = minClear(tri2, others);
          if (m2 > bestMn) { bestMn = m2; best = tri2; }
        }
        rt = best || routeTo(s, t, 0);
      }
      var d = 'M' + rt.p1.x.toFixed(1) + ',' + rt.p1.y.toFixed(1) + ' Q' + rt.c.x.toFixed(1) + ',' + rt.c.y.toFixed(1) + ' ' + rt.p2.x.toFixed(1) + ',' + rt.p2.y.toFixed(1);
      var g = elNS('g', NET_NS);
      g.setAttribute('class', 'net-link ' + (l.kind === '同题' ? 'soft' : 'real'));
      g.appendChild(setAttrs(elNS('path', NET_NS), { d: d, class: 'net-hit' }));
      g.appendChild(setAttrs(elNS('path', NET_NS), { d: d, class: 'net-line', 'marker-end': 'url(#netAr)' }));
      /* 线签：沿弧 17 位 × 法向 7 偏移逐一试放；圆心、门类签（含本线两端）、已有签字皆当障碍 */
      /* 字宽实测：门类签与线签每字约 13.9 unit，字身高 14.4 */
      var halfW = l.type.length * 7 + 2, placed = null, tpos = [0.5], k;
      for (k = 1; k < 9; k++) { tpos.push(0.5 + k * 0.06); tpos.push(0.5 - k * 0.06); }
      var offs = [0, 12, -12, 24, -24, 36, -36];
      function groupHits(x2, y2, hw) {
        var c = 0, i, gn, gw;
        for (i = 0; i < WXRELATIONS.nodes.length; i++) {
          gn = WXRELATIONS.nodes[i];
          gw = (gn.g || '').length * 13.9;
          if (Math.abs(x2 - gn.x) < hw + gw / 2 && Math.abs(y2 - (gn.y + NET_R + 22)) < 15) c++;
        }
        return c;
      }
      function tryPlace(x2, y2) {
        if (x2 - halfW < 60 || x2 + halfW > 940 || y2 < 46 || y2 > 700) return false;
        for (var w = 0; w < others.length; w++) {
          var bx = Math.max(x2 - halfW, Math.min(others[w].x, x2 + halfW));
          var by = Math.max(y2 - 9, Math.min(others[w].y, y2 + 5));
          if (Math.hypot(others[w].x - bx, others[w].y - by) <= NET_R + 2) return false;
        }
        if (groupHits(x2, y2, halfW)) return false;
        for (var z = 0; z < occupied.length; z++) {
          var ob = occupied[z];
          if (Math.abs(x2 - ob.cx) < halfW + ob.hw + 2 && Math.abs(y2 - ob.cy) < 15) return false;
        }
        return true;
      }
      for (k = 0; k < tpos.length && !placed; k++) {
        var u = Math.max(0.08, Math.min(0.92, tpos[k]));
        var a2 = curveAt(rt, u), t3 = curveAt(rt, Math.min(0.98, u + 0.02));
        var nx2 = -(t3.y - a2.y), ny2 = (t3.x - a2.x), nl2 = Math.sqrt(nx2 * nx2 + ny2 * ny2) || 1;
        nx2 /= nl2; ny2 /= nl2;
        for (var oi = 0; oi < offs.length && !placed; oi++) {
          var px = a2.x + nx2 * offs[oi], py = a2.y + ny2 * offs[oi] - 3;
          if (tryPlace(px, py)) placed = { x: px, y: py };
        }
      }
      if (!placed) {
        /* 无处可放：弧顶附近细网格取与签字重叠最少之处，而非一律落弧顶 */
        var m2 = curveAt(rt, 0.5), best = null, bestN = 99;
        for (var i1 = -4; i1 <= 4; i1++) {
          for (var i2 = -5; i2 <= 5; i2++) {
            var px3 = m2.x + i1 * 12, py3 = m2.y + i2 * 10 - 3;
            if (px3 - halfW < 60 || px3 + halfW > 940 || py3 < 46 || py3 > 700) continue;
            var n3 = groupHits(px3, py3, halfW);
            for (var z3 = 0; z3 < occupied.length; z3++) {
              if (Math.abs(px3 - occupied[z3].cx) < halfW + occupied[z3].hw &&
                  Math.abs(py3 - occupied[z3].cy) < 15) n3++;
            }
            if (n3 === 0) { placed = { x: px3, y: py3 }; break; }
            if (n3 < bestN) { bestN = n3; best = { x: px3, y: py3 }; }
          }
          if (placed) break;
        }
        if (!placed) placed = best || { x: m2.x, y: m2.y - 3 };
      }
      occupied.push({ cx: placed.x, cy: placed.y, hw: halfW });
      var tg = setAttrs(elNS('text', NET_NS), { x: placed.x, y: placed.y, class: 'net-ltype' });
      tg.textContent = l.type;
      g.appendChild(tg);
      g.addEventListener('click', function (e) { e.stopPropagation(); showLink(l); });
      svg.appendChild(g);
      linkEls.push({ g: g, l: l });
    });

    WXRELATIONS.nodes.forEach(function (n) {
      var g = elNS('g', NET_NS);
      g.setAttribute('class', 'net-node ' + (NET_GROUP_CLS[n.g] || 'c2'));
      g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
      g.appendChild(setAttrs(elNS('circle', NET_NS), { r: NET_R }));
      var nm = setAttrs(elNS('text', NET_NS), { y: 6, class: 'net-name' });
      nm.textContent = n.name;
      g.appendChild(nm);
      var gp = setAttrs(elNS('text', NET_NS), { y: NET_R + 22, class: 'net-group' });
      gp.textContent = n.g;
      g.appendChild(gp);
      g.addEventListener('click', function (e) { e.stopPropagation(); showNode(n); });
      g.addEventListener('mouseenter', function () { paint(n.id); });
      g.addEventListener('mouseleave', function () { paint(current); });
      svg.appendChild(g);
      nodeEls[n.id] = g;
    });

    var order = ['塔主', '公门', '修士', '邪路', '异闻', '异物'];
    var cnt = {};
    WXRELATIONS.nodes.forEach(function (n) { cnt[n.g] = (cnt[n.g] || 0) + 1; });
    Object.keys(cnt).sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }).forEach(function (gname) {
      var item = el('span', 'lg-item');
      item.appendChild(el('i', 'lg-dot ' + (NET_GROUP_CLS[gname] || 'c2')));
      item.appendChild(txt(el('span'), gname + ' ' + cnt[gname] + ' 人'));
      legend.appendChild(item);
    });
    var l1 = el('span', 'lg-item');
    l1.appendChild(el('i', 'lg-rule real'));
    l1.appendChild(txt(el('span'), '同场 ' + WXRELATIONS.links.filter(function (l) { return l.kind === '同场'; }).length + ' 线'));
    legend.appendChild(l1);
    var l2 = el('span', 'lg-item');
    l2.appendChild(el('i', 'lg-rule soft'));
    l2.appendChild(txt(el('span'), '同题 ' + WXRELATIONS.links.filter(function (l) { return l.kind === '同题'; }).length + ' 线'));
    legend.appendChild(l2);

    showNone();
    svg.addEventListener('click', function () { showNone(); });
    attachPanZoom(svg, 1000, 760);
  }

  /* 桩签：图上点桩不跳页，就地在卷宗栏开签（与京、道同制） */
  function openStake(no) {
    var k = (typeof WXSTAKES !== 'undefined' ? WXSTAKES : []).filter(function (x) { return x.no === no; })[0];
    if (!k) return;
    $$('#mapSvg .nd.sel').forEach(function (g) { g.classList.remove('sel'); });
    $$('#mapSvg .rd.sel').forEach(function (g) { g.classList.remove('sel'); });
    var box = $('#cityDetail');
    box.innerHTML = '';
    box.appendChild(txt(el('p', 'cd-kicker'), '桩签 · ' + k.state + ' · 界桩志录'));
    var h = el('div', 'cd-head');
    h.appendChild(txt(el('span', 'cd-nu'), k.no));
    h.appendChild(txt(el('h4'), k.name));
    box.appendChild(h);
    box.appendChild(txt(el('p', 'cd-tower'), k.where));
    box.appendChild(txt(el('blockquote', 'cd-motto'), '桩面：' + k.face));
    box.appendChild(txt(el('p', 'cd-text'), '量语：' + k.measure));
    box.appendChild(txt(el('p', 'cd-text'), k.note));
    var ln = el('div', 'cd-links');
    var b1 = el('button', 'chip');
    txt(b1, '翻看界桩志');
    b1.addEventListener('click', function () { focusStake(k.no); });
    ln.appendChild(b1);
    var cit = cityById[k.cid];
    if (cit) {
      var b2 = el('button', 'chip');
      txt(b2, '所辖京 · ' + cit.name);
      b2.addEventListener('click', function () { openCity(cit.id); });
      ln.appendChild(b2);
    }
    box.appendChild(ln);
  }

  /* ---------------- 勾稽共用（人物志／众生谱字下点金；异闻自持一份） ---------------- */
  var LR_READY = false;
  var LR_LORE = {};
  var LR_RX = null;
  function lrBuild() {
    if (LR_READY) return;
    var lore = {};
    WXLEXICON.forEach(function (x) { if (x.t.length >= 2) lore[x.t] = { k: 'lex' }; });
    WXCHARS.forEach(function (c) { lore[c.name] = { k: 'c', v: c.id }; });
    WXCITIES.forEach(function (c) { lore[c.name] = { k: 'city', v: c.id }; });
    var keys = Object.keys(lore).sort(function (a, b) { return b.length - a.length; });
    LR_LORE = lore;
    LR_RX = keys.length ? new RegExp('(' + keys.map(function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'g') : null;
    LR_READY = true;
  }
  function lrEl(w) {
    var info = LR_LORE[w];
    var sp = el('span', 'lx');
    sp.setAttribute('data-k', info.k);
    if (info.v) sp.setAttribute('data-v', info.v);
    txt(sp, w);
    return sp;
  }
  function lrDecorate(text, seen, plain) {
    lrBuild();
    if (plain || !LR_RX) return document.createTextNode(text);
    var frag = document.createDocumentFragment();
    var last = 0; var m;
    LR_RX.lastIndex = 0;
    while ((m = LR_RX.exec(text))) {
      var w = m[1];
      if (seen[w]) continue;
      seen[w] = true;
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(lrEl(w));
      last = m.index + w.length;
    }
    if (!frag.childNodes.length) return document.createTextNode(text);
    frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }
  function lrGo(lx) {
    var k = lx.getAttribute('data-k');
    if (k === 'c') { focusChar(lx.getAttribute('data-v')); return; }
    if (k === 'city') { show('map'); openCity(lx.getAttribute('data-v')); return; }
    show('lexicon');
    var ip = $('#lexSearch');
    if (ip) { ip.value = lx.textContent; ip.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  /* 人物志 ⇄ 关系网：网侧「开人物志」落卡——复位门类、点起该卡并闪记 */
  function focusChar(id) {
    show('characters');
    var all = document.querySelector('#charTabs .chip[data-cat="全部"]');
    if (all) all.click();
    var card = document.querySelector('#charGrid .char-card[data-id="' + id + '"]');
    if (!card) return;
    $$('#charGrid .char-card').forEach(function (c) { c.classList.toggle('sel', c === card); });
    card.classList.add('char-flash');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { card.classList.remove('char-flash'); }, 2800);
  }

  /* ---------------- 界桩志（一百零八根中取十二根） ---------------- */
  /* 图上桩 ⇄ 桩卡 双向点亮：markStake 在天地图上选中那一根并打涟漪，
     桩卡进城、图上点桩、索引跳转三路都经此在图上留「桩在何处」之记 */
  function markStake(no) {
    $$('#mapSvg .stake').forEach(function (g) {
      g.classList.toggle('stake-live', g.getAttribute('data-no') === no);
    });
    var st = document.querySelector('#mapSvg .stake[data-no="' + no + '"]');
    if (st) {
      st.classList.remove('stake-ping');
      void st.getBoundingClientRect();
      st.classList.add('stake-ping');
      setTimeout(function () { st.classList.remove('stake-ping'); }, 700);
    }
  }
  /* 天地图点桩、索引跳转都走这里：先复位筛签到「全部」，再翻到那一条并点亮 */
  function focusStake(no) {
    markStake(no);
    show('stakes');
    var all = document.querySelector('#stakeTabs .chip[data-state="全部"]');
    if (all) all.click();
    var card = document.querySelector('#stakeList .stake-card[data-no="' + no + '"]');
    if (!card) return;
    card.classList.add('stake-flash');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { card.classList.remove('stake-flash'); }, 2800);
  }

  function buildStakes() {
    var tabs = $('#stakeTabs'), list = $('#stakeList');
    if (!tabs || !list || typeof WXSTAKES === 'undefined') return;
    txt($('#stakeLead'), '界桩一百零八根，圈定「账内」——桩内是账，桩外是雾。此册录有故事的十二根，桩桩皆有一笔「贷方」未写。桩位按计里画方折度落在天地图上，图上点桩即开桩签；点一根桩，可「去图上找桩」，也可转去所辖京卷宗。');
    var cur = '全部';
    list.addEventListener('click', function (e) {
      var lx = e.target.closest ? e.target.closest('.lx') : null;
      if (lx) lrGo(lx);
    });
    function render() {
      list.innerHTML = '';
      WXSTAKES.filter(function (k) { return cur === '全部' || k.state === cur; }).forEach(function (k) {
        var card = el('article', 'being stake-card st-' + k.state);
        card.setAttribute('tabindex', '0');
        card.setAttribute('data-no', k.no);
        var top = el('div', 'being-top');
        top.appendChild(txt(el('h4'), k.name));
        top.appendChild(txt(el('span', 'also'), k.state));
        card.appendChild(top);
        card.appendChild(txt(el('p', 'sub'), k.no + ' · ' + k.where + ' · 桩面：' + k.face));
        var txtp = el('p', 'text');
        var seenK = {};
        txtp.appendChild(lrDecorate(k.note, seenK, false));
        card.appendChild(txtp);
        var acts = el('div', 'stake-acts');
        var bFind = el('button', 'chip');
        txt(bFind, '去图上找桩');
        bFind.addEventListener('click', function (e) { e.stopPropagation(); markStake(k.no); show('map'); openStake(k.no); });
        acts.appendChild(bFind);
        var cit = cityById[k.cid];
        if (cit) {
          var bCit = el('button', 'chip');
          txt(bCit, '看所辖京 · ' + cit.name);
          bCit.addEventListener('click', function (e) { e.stopPropagation(); markStake(k.no); show('map'); openCity(cit.id); });
          acts.appendChild(bCit);
        }
        /* v1.14.0 桩桩有正卷：界桩志回链该桩公案（与公门/故纸同构） */
        if (k.ref) {
          var bRef = el('button', 'chip');
          txt(bRef, '事见 · ' + k.ref);
          bRef.setAttribute('title', '回该桩正卷');
          bRef.addEventListener('click', function (e) { e.stopPropagation(); volGo(k.ref); });
          acts.appendChild(bRef);
        }
        card.appendChild(acts);
        card.addEventListener('click', function (e) {
          if (e.target.closest && e.target.closest('.lx')) return;
          $$('#stakeList .stake-card').forEach(function (c) { c.classList.toggle('sel', c === card); });
        });
        card.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); card.click(); } });
        linkVolumes(card);
        list.appendChild(card);
      });
    }
    ['全部', '在记', '已销', '自移', '存疑', '赊'].forEach(function (label) {
      var cnt = label === '全部' ? WXSTAKES.length : WXSTAKES.filter(function (k) { return k.state === label; }).length;
      var ch = el('button', 'chip' + (label === cur ? ' on' : ''));
      ch.setAttribute('data-state', label);
      txt(ch, label + ' · ' + cnt);
      ch.addEventListener('click', function () {
        cur = label;
        $$('#stakeTabs .chip').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-state') === label); });
        render();
      });
      tabs.appendChild(ch);
    });
    render();
  }

  /* ---------------- 存抄本（v1.09.0：整部书本地生成 .md 带走，零联网） ---------------- */
  function buildBible() {
    var L = [];
    var d = new Date();
    var ver = WXUPDATES[0] ? WXUPDATES[0].v : '';
    L.push('# 万象天账 · 墨序司异闻籍');
    L.push('');
    L.push('> ' + WXCORE.motto + '');
    L.push('> 抄本 ' + ver + ' · ' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · 自本机浏览器存出，未经网络');
    L.push('');
    L.push('## 卷首 · 总纲');
    WXCORE.preamble.forEach(function (p) { L.push('> ' + p); });
    L.push('');
    L.push('### 三律');
    WXCORE.laws.forEach(function (w) {
      L.push('**' + w.no + ' · ' + w.name + '（' + w.also + '）**');
      L.push('');
      L.push(w.text);
      L.push('');
      L.push('谚曰：' + w.proverb);
      L.push('');
    });
    L.push('### 墨序五层');
    L.push(WXCORE.moxu.head);
    L.push('');
    WXCORE.moxu.layers.forEach(function (y) { L.push('- **' + y.name + '**（' + y.status + '）：' + y.text); });
    L.push('');
    L.push('### 境界九阶');
    L.push(WXCORE.levels.intro);
    L.push('');
    WXCORE.levels.list.forEach(function (v) { L.push('- ' + v.numeral + ' · ' + v.name + '（' + v.amt + '；判据：' + v.test + '）：' + v.note); });
    L.push('');
    L.push('### 鉴真五问');
    WXCORE.falsify.qs.forEach(function (q) { L.push('- ' + q.q + '——' + q.a); });
    if (typeof WXFOUR !== 'undefined') {
      L.push('');
      L.push('### 四柱清册（' + WXFOUR.formula + '）');
      L.push(WXFOUR.intro);
      L.push('');
      WXFOUR.pillars.forEach(function (p) { L.push('- **' + p.name + '**（' + p.en + '）：' + p.text); });
      L.push('- **合龙门**（' + WXFOUR.longmen.formula + '）：' + WXFOUR.longmen.text);
    }
    L.push('');
    L.push('## 历纪');
    L.push(WXTIMELINE.unit);
    L.push('');
    WXTIMELINE.eras.forEach(function (e) {
      L.push('### ' + e.no + ' · ' + e.name + '（' + e.span + '）');
      e.events.forEach(function (v) { L.push('- ' + v); });
      L.push('');
    });
    L.push('### 甲子账牌');
    L.push(WXTIMELINE.jiazi);
    L.push('');
    L.push('- 十干（账德）：' + WXTIMELINE.gans.join('、') + '——' + WXTIMELINE.ganDe);
    L.push('- 十二支（京）：' + WXTIMELINE.zhis.join('、') + '——' + WXTIMELINE.zhiShuo);
    var faces = [];
    for (var fi = 0; fi < 60; fi++) faces.push(WXTIMELINE.gans[fi % 10] + WXTIMELINE.zhis[fi % 12]);
    L.push('- 六十面周流：' + faces.join('、'));
    L.push('');
    L.push('## 十三京');
    L.push('');
    L.push('计里画方：' + WXMAP.grid.note + '；跨金沟以桥，渡沟有禁。' + WXMAP.spineNote);
    L.push('');
    WXCITIES.forEach(function (c) {
      L.push('### ' + c.name + ' · ' + c.tower + '（' + c.page + '，' + c.tag + '）');
      L.push('- 铭：' + c.motto + '｜产：' + c.goods3 + '｜算位：横 ' + c.pos[0] + ' · 纵 ' + c.pos[1]);
      L.push('- 志：' + c.text);
      L.push('- 缝：' + c.hook);
      L.push('');
    });
    L.push('### 道里');
    WXMAP.roads.forEach(function (r) { L.push('- ' + r.road + '：' + cnNum(r.li) + '里——' + r.note); });
    L.push('');
    L.push('## 岁令');
    WXSUILING.months.forEach(function (m) { L.push('- **' + m.m + ' · ' + m.name + '**（令：' + m.order + '）：' + m.text); });
    L.push('');
    L.push('## 公门表');
    WXORGANS.forEach(function (o) { L.push('- **' + o.n + '**（' + o.seat + '；掌' + o.role + '）主事：' + o.head + '；规矩——' + o.law + (o.ref ? '〔' + o.ref + '〕' : '')); });
    L.push('');
    L.push('## 众生谱');
    WXBEINGS.forEach(function (b) { L.push('- **' + b.name + '**（' + b.cat + '｜' + b.also + '）：' + b.head + '　' + b.text); });
    L.push('');
    L.push('## 人物志' + WXCHARS.length + '人');
    WXCHARS.forEach(function (c) {
      L.push('### ' + c.name + ' · ' + c.title + '（' + c.place + '，' + c.cat + '）');
      L.push('- 性：' + c.temper + '｜出处：' + c.origin);
      L.push('- ' + c.text);
      L.push('- 缝：' + c.hook);
      L.push('');
    });
    L.push('## 关系' + WXRELATIONS.nodes.length + '人' + WXRELATIONS.links.length + '线');
    WXRELATIONS.links.forEach(function (l) {
      var a = WXRELATIONS.nodes.filter(function (n) { return n.id === l.s; })[0];
      var b = WXRELATIONS.nodes.filter(function (n) { return n.id === l.t; })[0];
      L.push('- ' + (a ? a.name : l.s) + (l.kind === '同题' ? '···' : '→') + (b ? b.name : l.t) + '（' + l.kind + '·' + l.type + '）：' + l.note);
    });
    L.push('');
    L.push('## 界桩志');
    WXSTAKES.forEach(function (k) { L.push('- **' + k.no + ' · ' + k.name + '**（' + k.state + '｜' + k.where + '）桩面：' + k.face + (k.ref ? '〔事见' + k.ref + '〕' : '') + '——' + k.note); });
    L.push('');
    L.push('## 货殖');
    WXGOODS.forEach(function (g) { L.push('- **' + g.n + '**（' + g.city + '）：' + g.d); });
    L.push('');
    L.push('## 仓衡三制');
    L.push(WXGRANARIES.intro);
    L.push('');
    WXGRANARIES.stores.forEach(function (s) {
      L.push('### ' + s.name + ' · ' + s.mark + '（' + s.place + '）');
      L.push('- 本：' + s.role);
      L.push('- 守：' + s.guard);
      L.push('- 缝：' + s.risk);
      L.push('');
    });
    WXGRANARIES.seasons.forEach(function (m) {
      L.push('### 仓事 · ' + m.name);
      L.push(m.summary);
      m.moves.forEach(function (x) { L.push('- ' + x.store + '：' + x.act); });
      L.push('- 勾稽口：' + m.audit);
      L.push('');
    });
    L.push('## 故纸');
    WXDOCS.forEach(function (p) { L.push('- **' + p.n + '**（' + p.kind + '｜' + p.seat + '｜' + p.when + '）：' + p.text + (p.ref ? '〔' + p.ref + '〕' : '')); });
    L.push('');
    L.push('## 人间试账');
    WXTRIALS.forEach(function (c) {
      L.push('### 案' + c.no + '《' + c.title + '》 · ' + c.place);
      L.push(c.premise);
      L.push('');
      c.choices.forEach(function (choice) {
        L.push('- **' + choice.title + '**');
        L.push('  - 贷方：' + choice.credit);
        L.push('  - 借方：' + choice.debit);
        L.push('  - 余账：' + choice.remainder);
        L.push('  - 判语：' + choice.verdict);
        L.push('  - 旁注：' + choice.note);
      });
      L.push('');
    });
    L.push('## 卷线');
    WXARCS.forEach(function (a) {
      var nos = a.s.map(function (id) {
        var x = WXSTORIES.filter(function (s) { return s.id === id; })[0];
        return x ? x.no : id;
      });
      L.push('- **' + a.n + '**（' + a.s.length + ' 卷：' + nos.join('、') + '）：' + a.d);
    });
    L.push('');
    L.push('## 异闻' + WXSTORIES.length + '卷');
    WXSTORIES.forEach(function (s) {
      L.push('### ' + s.no + '《' + s.title + '》');
      L.push('*' + s.sub + '*');
      L.push('');
      s.paras.forEach(function (p) { L.push('　　' + p); });
      L.push('');
      L.push('> ' + s.tail);
      L.push('');
    });
    L.push('## 词库' + WXLEXICON.length + '条');
    WXLEXICON.forEach(function (x) { L.push('- **' + x.t + '**（' + x.p + '·' + x.cat + '）：' + x.d); });
    L.push('');
    L.push('## 谚');
    L.push('### 京谚' + WXCITYSAYINGS.length + '则');
    WXCITYSAYINGS.forEach(function (s) { L.push('- ' + s); });
    L.push('### 账房谚' + WXSAYINGS.length + '则');
    WXSAYINGS.forEach(function (s, i) { L.push((i + 1) + '. ' + s); });
    L.push('');
    L.push('## 更新志' + WXUPDATES.length + '版');
    WXUPDATES.forEach(function (u) {
      L.push('### ' + u.v + '（' + u.date + '）· ' + u.title);
      u.items.forEach(function (it) { L.push('- ' + it); });
      L.push('');
    });
    L.push('## 溯源簿');
    WXTRACE.forEach(function (t) { L.push('- 出处：' + t.src + '｜取：' + t.take + (t.url ? '｜原文：' + t.url : '')); });
    L.push('');
    L.push('---');
    L.push(WXNOTE);
    return L.join('\n');
  }
  window.__wx_buildBible = buildBible; /* 自检用钩子（node 恢复后可在 headless 里比对） */
  function bibleDownload() {
    try {
      var md = buildBible();
      var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = el('a');
      a.href = url;
      a.download = '万象天账·' + (WXUPDATES[0] ? WXUPDATES[0].v : '') + '·抄本.md';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 4000);
    } catch (e) {
      window.alert('抄存未成：' + e.message);
    }
  }

  /* ---------------- 卷引用互开（v1.06.0 历纪接卷）：正文里「卷X」即可点 ---------------- */
  var VOLRX = /卷[零壹贰叁肆伍陆柒捌玖拾]{1,3}/g;
  /* v1.07.0 展线改重建式过滤：过滤器不再是 display:none 的遮罩，
     隐藏卷直接从册中不出现——回卷、卷目、罩 toggle 与展线不再互相打架 */
  var ARC_OF = {}, ARCSET = {};
  (typeof WXARCS !== 'undefined' ? WXARCS : []).forEach(function (a) {
    ARCSET[a.n] = {};
    a.s.forEach(function (id) { (ARC_OF[id] = ARC_OF[id] || []).push(a.n); ARCSET[a.n][id] = 1; });
  });
  var WX_CUR_ARC = null;
  var WX_FAV_ONLY = false;
  var STORY_RENDER = function () {};
  var favLabelRefresh = function () {};
  function favCountNow() {
    try { return JSON.parse(localStorage.getItem('wx_favs') || '[]').length; } catch (e) { return 0; }
  }
  function arcClear() {
    if (!WX_CUR_ARC) return;
    WX_CUR_ARC = null;
    $$('#arcChips .chip').forEach(function (c) { c.classList.remove('on'); });
    var tp = $('#arcTip');
    if (tp) txt(tp, '');
    STORY_RENDER();
  }
  function arcFilter(name) {
    WX_CUR_ARC = (WX_CUR_ARC === name) ? null : name;
    $$('#arcChips .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-arc') === WX_CUR_ARC); });
    var tip = $('#arcTip');
    if (tip) {
      if (WX_CUR_ARC) {
        var aa = (typeof WXARCS !== 'undefined' ? WXARCS : []).filter(function (x) { return x.n === WX_CUR_ARC; })[0];
        txt(tip, '正在展的线 · ' + WX_CUR_ARC + ' × ' + (aa ? aa.s.length : 0) + ' 卷——' + (aa ? aa.d : '') + '（再点一次收线）');
      } else txt(tip, '');
    }
    STORY_RENDER();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function volGo(no) {
    var s0 = WXSTORIES.filter(function (x) { return x.no === no; })[0];
    if (WX_CUR_ARC && s0 && !ARCSET[WX_CUR_ARC][s0.id]) arcClear();
    show('stories');
    var art = document.querySelector('#storyList article[data-no="' + no + '"]');
    if (art) {
      art.scrollIntoView({ behavior: 'smooth', block: 'start' });
      art.classList.add('story-flash');
      setTimeout(function () { art.classList.remove('story-flash'); }, 2400);
    }
  }
  /* 谱签反查（v1.13.0 是谱有卷）：卷→谱表升模块级，谱卡得挂回卷签 */
  var STORY_PU = {
    s18: { b: 'zhuangling', n: '桩灵' },
    s41: { b: 'sui', n: '祟' },
    s47: { b: 'momin', n: '墨民' },
    s48: { b: 'zhuan', n: '篆灵' }
  };
  var PU_STORY = {};
  Object.keys(STORY_PU).forEach(function (sid) { PU_STORY[STORY_PU[sid].n] = sid; });

  function linkVolumes(root) {
    if (!root) return;
    var ok = {};
    WXSTORIES.forEach(function (s) { ok[s.no] = 1; });
    /* v1.13.0 改文本节点级包裹：不 flatten 已有 .lx 勾稽字，可安全用于众生/人物/界桩等重建页 */
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, function (tn) {
      var p = tn.parentNode;
      if (!p || !tn.nodeValue || !tn.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (p.closest && p.closest('.lx')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    });
    var targets = [];
    while (tw.nextNode()) targets.push(tw.currentNode);
    targets.forEach(function (tn) {
      var t = tn.nodeValue;
      VOLRX.lastIndex = 0;
      if (!VOLRX.test(t)) return;
      VOLRX.lastIndex = 0;
      var frag = document.createDocumentFragment(), last = 0, m;
      while ((m = VOLRX.exec(t))) {
        if (!ok[m[0]]) continue;
        frag.appendChild(document.createTextNode(t.slice(last, m.index)));
        var sp = el('span', 'lx vol-lk');
        sp.setAttribute('data-no', m[0]);
        txt(sp, m[0]);
        frag.appendChild(sp);
        last = m.index + m[0].length;
      }
      if (last) {
        frag.appendChild(document.createTextNode(t.slice(last)));
        tn.parentNode.replaceChild(frag, tn);
      }
    });
  }
  document.addEventListener('click', function (e) {
    var v = e.target.closest ? e.target.closest('.vol-lk') : null;
    if (v) volGo(v.getAttribute('data-no'));
  });

  /* ---------------- 启动 ---------------- */
  buildHome();
  buildMap();
  buildPower();
  buildTrial();
  buildJudge();
  buildFour();
  buildBeings();
  buildTimeline();
  linkVolumes($('#pg-timeline'));
  /* 词库/异闻/拾句/人物/更新志五本重书已入 LAZY——首入其页才建 */
  buildFind();
  buildGoods();
  buildGranaries();
  buildStakes();
  buildSuiling();
  buildOrgans();
  buildDocs();
  buildNetwork();
  ['#bibleBtn', '#bibleBtnHome'].forEach(function (sel) {
    var bx = $(sel);
    if (bx) bx.addEventListener('click', bibleDownload);
  });
  buildEra();
  buildJiazi();
  ticker();
  if (location.hash && location.hash.length > 1) show(location.hash.slice(1), true);
})();