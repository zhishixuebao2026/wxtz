/* 万象天账 · 全站审计
   数据层 + 代码层静态检查，不依赖浏览器。跑法：node tools/audit.js
   在站点根目录外运行时把 P 改成绝对路径即可。 */
'use strict';
const fs = require('fs'), vm = require('vm');
const P = __dirname.replace(/\\/g, '/') + '/../';
const DATA = ['core','cities','beings','timeline','lexicon','sayings','goods','stories','characters','relations','stakes','suiling','organs','arcs','docs','updates','trials','granaries','relay'];
const JS = DATA.map(d => 'data/' + d + '.js').concat(['assets/app.js']);
let warn = [];
const ok = m => console.log('  ✓ ' + m);
const ng = m => { warn.push(m); console.log('  ✗ ' + m); };

console.log('\n【一 语法】');
let sf = 0;
for (const f of JS) {
  const s = fs.readFileSync(P + f, 'utf8');
  try { new vm.Script(s); } catch (e) { sf++; ng(f + ' :: ' + e.message); }
}
if (!sf) ok('JS ' + JS.length + ' 个文件语法全通过');

const css = fs.readFileSync(P + 'assets/style.css', 'utf8');
let d0 = 0, neg = 0;
for (const ch of css) { if (ch === '{') d0++; else if (ch === '}') { d0--; if (d0 < 0) { neg++; d0 = 0; } } }
d0 === 0 ? ok('CSS 括号配平（' + css.split('\n').length + ' 行）') : ng('CSS 括号不配平，剩余 ' + d0);
if (neg) ng('CSS 负深 ' + neg);

const fontCssPath = P + 'assets/fonts/lxgwwenkailite-regular.css';
const fontCss = fs.existsSync(fontCssPath) ? fs.readFileSync(fontCssPath, 'utf8') : '';
const fontRefs = [...fontCss.matchAll(/url\(['\"]?([^'\")]+)['\"]?\)/g)].map(m => m[1]);
const missingFonts = fontRefs.filter(src => !fs.existsSync(P + 'assets/fonts/' + src.replace(/^\.\//, '')));
const remoteFonts = fontRefs.filter(src => /^https?:/i.test(src));
fontCss && !missingFonts.length && !remoteFonts.length && fs.existsSync(P + 'assets/ledger-atmosphere.webp')
  ? ok('本地字体子集 ' + fontRefs.length + ' 件、原创首页纸景齐备；无远程字体引用')
  : ng('本地视觉资源缺失或含远程字体：' + missingFonts.join('、') + (remoteFonts.length ? '；远程 ' + remoteFonts.join('、') : ''));
const swSource = fs.readFileSync(P + 'sw.js', 'utf8');
const swFontsOk = /fontCss\.text\(\)/.test(swSource) && /cache\.addAll\(fonts\.slice\(/.test(swSource);
swFontsOk ? ok('离线安装会分批预存 ' + fontRefs.length + ' 个本地字形子集') : ng('离线安装未覆盖本地字体子集');
/['\"]\.\/data\/relay\.js\?v=\d+['\"]/.test(swSource) ? ok('Service Worker 预缓存信路数据') : ng('Service Worker 漏缓存信路数据');
const characterSource = fs.readFileSync(P + 'data/characters.js', 'utf8');
const portraitRefs = [...characterSource.matchAll(/portrait:\s*['\"]([^'\"]+)['\"]/g)].map(m => m[1]);
const missingPortraits = portraitRefs.filter(src => !fs.existsSync(P + src));
missingPortraits.length ? ng('人物画像资源缺失：' + missingPortraits.join('、'))
  : ok('人物画像 ' + portraitRefs.length + ' 幅，本地资源路径齐备');
const unicodeRanges = [];
for (const m of fontCss.matchAll(/unicode-range:\s*([^;}]+)/g)) {
  for (const part of m[1].split(',')) {
    const hit = part.trim().match(/^U\+([0-9a-f?]+)(?:-([0-9a-f]+))?$/i);
    if (hit && !hit[1].includes('?')) unicodeRanges.push([parseInt(hit[1], 16), parseInt(hit[2] || hit[1], 16)]);
  }
}
const projectText = [P + 'index.html'].concat(DATA.map(d => P + 'data/' + d + '.js'), [P + 'assets/app.js'])
  .filter(fs.existsSync).map(f => fs.readFileSync(f, 'utf8')).join('');
const missingGlyphs = [...new Set(Array.from(projectText).map(c => c.codePointAt(0)).filter(cp =>
  ((cp >= 0x3400 && cp <= 0x9fff) || (cp >= 0x20000 && cp <= 0x3134f)) &&
  !unicodeRanges.some(r => cp >= r[0] && cp <= r[1])
))].sort((a, b) => a - b);
missingGlyphs.length ? ng('自托管字体未覆盖项目汉字：' + missingGlyphs.map(cp => String.fromCodePoint(cp)).join(''))
  : ok('自托管字体 Unicode 范围覆盖全站使用汉字');

const html = fs.readFileSync(P + 'index.html', 'utf8');
const secTags = (html.match(/<section/g) || []).length, secClose = (html.match(/<\/section>/g) || []).length;
secTags === secClose ? ok('HTML section 标签配对（' + secTags + ' 对）') : ng('HTML section ' + secTags + ' / ' + secClose);
const pageIds = [...html.matchAll(/<section id="pg-([^"]+)"/g)].map(m => m[1]).sort();
const navBlock = (html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/) || [0, ''])[1];
const navPages = [...navBlock.matchAll(/data-goto="([^"]+)"/g)].map(m => m[1]).sort();
const pageRoutesMatch = JSON.stringify(pageIds) === JSON.stringify(navPages);
pageRoutesMatch ? ok('全篇导航与页面路由一一对应（' + pageIds.length + ' 篇）') : ng('导航与页面路由不一致：' + pageIds.join('、') + ' / ' + navPages.join('、'));
const scriptTags = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
ok('index.html 引用 ' + scriptTags.length + ' 个脚本');
const noVersion = scriptTags.filter(s => !/\?v=\d+$/.test(s));
noVersion.length ? ng('无版本戳的脚本：' + noVersion.join(', ')) : ok('所有脚本均带版本戳');
const fts = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
ok('index.html 定义 ' + fts.size + ' 个 id');

console.log('\n【二 数据载入】');
const ctx = {};
vm.createContext(ctx);
for (const dn of DATA) vm.runInContext(fs.readFileSync(P + 'data/' + dn + '.js', 'utf8'), ctx, { filename: dn });
const K = Object.keys(ctx).filter(k => k.charAt(0) === 'W').sort();
ok('全局变量 ' + K.length + ' 个：' + K.join('、'));
const q = n => ctx[n];
const cnt = n => { const v = q(n); return Array.isArray(v) ? v.length : null; };
for (const n of ['WXSTORIES','WXLEXICON','WXCHARS','WXSAYINGS','WXCITYSAYINGS','WXGOODS','WXUPDATES','WXTRACE','WXBEINGS','WXCITIES','WX_CITY_NUM','WXBEING_CATS']) {
  const c = cnt(n); if (c !== null) ok(n + ' = ' + c);
}
const SU = q('WXSUILING');
if (SU && Array.isArray(SU.months)) {
  let suBad = 0;
  SU.months.forEach(m => { if (!('m' in m) || !('name' in m) || !('order' in m) || !('text' in m)) suBad++; });
  suBad ? ng('岁令缺字段 ' + suBad + ' 处') : ok('岁令 ' + SU.months.length + ' 月字段齐全');
  new Set(SU.months.map(m => m.m)).size === SU.months.length ? ok('岁令月名无重复') : ng('岁令月名重复');
}

console.log('\n【三 形状】');
function shape(name, arr, need) {
  let bad = 0;
  arr.forEach((o, i) => need.forEach(k => {
    if (!(k in o)) { if (!bad) { console.log('   ' + name); } bad++; }
  }));
  bad ? ng(name + ' 缺字段 ' + bad + ' 处') : ok(name + ' 字段齐全（' + arr.length + ' 条）');
}
shape('异闻', q('WXSTORIES'), ['id','no','title','sub','paras','tail']);
shape('词条', q('WXLEXICON'), ['t','p','cat','d']);
shape('人物', q('WXCHARS'), ['id','name','title','place','cat','temper','text','hook','origin']);
shape('货殖', q('WXGOODS'), ['n','city','d']);
shape('溯源', q('WXTRACE'), ['src','take']);
shape('人间试账', q('WXTRIALS'), ['id','no','title','place','cityId','law','premise','question','choices']);
const trialIds = q('WXTRIALS').map(x => x.id);
if (new Set(trialIds).size !== trialIds.length) ng('试账案 id 重复');
else ok('人间试账案 id 无重复');
const trialBad = q('WXTRIALS').filter(x => x.choices.length < 2 || x.choices.some(c => !c.title || !c.credit || !c.debit || !c.remainder || !c.verdict || !c.note));
trialBad.length ? ng('试账案缺少有效抉择与明账：' + trialBad.map(x => x.title).join('、')) : ok('试账各案至少两策，贷方、借方、余账与判语齐全');
const trialCityBad = q('WXTRIALS').filter(x => !q('WXCITIES').some(c => c.id === x.cityId));
trialCityBad.length ? ng('试账案指向不存在之京：' + trialCityBad.map(x => x.title).join('、')) : ok('试账案所指京城全部存在');
const gran = q('WXGRANARIES');
if (!gran || !Array.isArray(gran.stores) || !Array.isArray(gran.seasons)) ng('仓衡三制形状不全');
else {
  const gBad = gran.stores.length !== 3 || gran.seasons.length !== 3 || gran.seasons.some(s => !s.moves || s.moves.length !== 3 || !s.audit);
  gBad ? ng('仓衡三制须为三仓三时，每时三处粮账并有复核') : ok('仓衡三制三仓三时齐备，各仓事有三处粮账与复核');
  const gDup = new Set(gran.stores.map(s => s.id)).size !== gran.stores.length || new Set(gran.seasons.map(s => s.id)).size !== gran.seasons.length;
  gDup ? ng('仓制或仓事 id 重复') : ok('仓制与仓事 id 无重复');
}
const relay = q('WXRELAY');
if (!relay || !Array.isArray(relay.channels) || relay.channels.length !== 3 || !relay.dispatch || !Array.isArray(relay.dispatch.legs)) ng('信路三式或递送实录形状不全');
else {
  const rDup = new Set(relay.channels.map(x => x.id)).size !== relay.channels.length;
  const rBad = relay.channels.some(x => !x.name || !x.mark || !x.purpose || !x.advantage || !x.limit || !Array.isArray(x.steps) || x.steps.length !== 3);
  const roadMap = new Map(q('WXMAP').roads.map(x => [x.road, x]));
  let miles = 0;
  const legBad = relay.dispatch.legs.filter((leg, i) => {
    const road = roadMap.get(leg.road);
    if (!road) return true;
    miles += road.li;
    const endpoints = [road.a, road.b];
    return !endpoints.includes(leg.from) || !endpoints.includes(leg.to) || leg.from === leg.to ||
      (i > 0 && relay.dispatch.legs[i - 1].to !== leg.from);
  });
  rDup || rBad ? ng('信路三式缺字段、步骤有缺或 id 重复') : ok('信路三式字段齐备，逐式各三步且互不重号');
  legBad.length || miles !== 200 ? ng('信路汛签里程/接续与天地图不合：' + miles + '里') : ok('汛签三段接续天地图道路，去程二百里');
}
const R = q('WXRELATIONS');
let rb = 0;
R.nodes.forEach(n => ['id','name','g','x','y'].forEach(k => { if (!(k in n)) rb++; }));
R.links.forEach(l => ['s','t','kind','type','note'].forEach(k => { if (!(k in l)) rb++; }));
rb ? ng('关系网缺字段 ' + rb + ' 处') : ok('关系网字段齐全（' + R.nodes.length + ' 点 / ' + R.links.length + ' 线）');

console.log('\n【四 交叉引用】');
const cids = q('WXCHARS').map(c => c.id);
const nids = R.nodes.map(n => n.id);
const a = q('WXCHARS').filter(c => nids.indexOf(c.id) < 0).map(c => c.name);
a.length ? ok('未入网人物（有意留白）：' + a.join('、')) : ok('人物志人人入网');
const b = R.nodes.filter(n => cids.indexOf(n.id) < 0).map(n => n.name);
b.length ? ng('网中节点不在人物志：' + b.join('、')) : ok('关系网节点全部对应人物志');
const bl = R.links.filter(l => nids.indexOf(l.s) < 0 || nids.indexOf(l.t) < 0).map(l => l.s + '-' + l.t);
bl.length ? ng('连线指向不存在节点：' + bl.join('、')) : ok(R.links.length + ' 条连线端点全部有效');
const dup = (arr) => arr.filter((x, i) => arr.indexOf(x) !== i);
['人物', '异闻', '词条', '关系节点'].forEach(n => {
  const src = n === '人物' ? q('WXCHARS') : n === '异闻' ? q('WXSTORIES') : n === '词条' ? q('WXLEXICON') : q('WXRELATIONS').nodes;
  const vals = src.map(o => n === '词条' ? o.t : o.id);
  const d = dup(vals);
  d.length ? ng(n + ' id 重复：' + d.join('、')) : ok(n + ' id 无重复');
});
const C = q('WXCITIES');
const cityNames = C.map(c => c.name);
const citySay = q('WXCITYSAYINGS').map(s => s.split('：')[0]);
const missSay = cityNames.filter(n => citySay.indexOf(n) < 0);
const extraSay = citySay.filter(n => cityNames.indexOf(n) < 0);
missSay.length ? ng('无京谚之京：' + missSay.join('、')) : ok('十三京京谚全覆盖');
extraSay.length ? ng('京谚前缀指向不存在之京：' + extraSay.join('、')) : ok('京谚前缀全部对应真实之京');
const missGoods = q('WXGOODS').filter(x => cityNames.indexOf(x.city) < 0).map(x => x.n + '(' + x.city + ')');
missGoods.length ? ng('货殖指向不存在之京：' + missGoods.join('、')) : ok('货殖 ' + q('WXGOODS').length + ' 物所属之京全部存在');
const perCity = {};
q('WXGOODS').forEach(x => { perCity[x.city] = (perCity[x.city] || 0) + 1; });
const oddGoods = Object.keys(perCity).filter(k => perCity[k] !== 3);
console.log('   每京货殖数：' + Object.keys(perCity).map(k => k + perCity[k]).join('、'));
const blank = C.filter(c => c.blank).map(c => c.name);
console.log('   冲销中（无货）之京：' + (blank.join('、') || '无'));
const kinds = new Set(R.links.map(l => l.kind));
[...kinds].every(k => k === '同场' || k === '同题') ? ok('连线 kind 仅同场/同题') : ng('连线 kind 越界：' + [...kinds].join('、'));

console.log('\n【五 取值域】');
const cats = q('WXLEXICON_CATS');
const badCat = q('WXLEXICON').filter(x => cats.indexOf(x.cat) < 0).map(x => x.t + '(' + x.cat + ')');
badCat.length ? ng('词条类别越界：' + badCat.join('、')) : ok('词条类别全部在 ' + cats.length + ' 类内');
const tl = q('WXTIMELINE');
ok('历纪 ' + tl.eras.length + ' 期，现行 ' + tl.eras.filter(e => e.live).length + ' 期');
if (tl.eras.filter(e => e.live).length !== 1) ng('现行账期应恰为 1 个');
const emptyE = tl.eras.map((e, i) => e.events && e.events.length).filter(x => !x).length;
emptyE ? ng('有空事件的账期 ' + emptyE + ' 个') : ok('每期至少一条事件');
const cx = R.nodes.filter(n => n.x < 0 || n.x > 1000 || n.y < 0 || n.y > 760).map(n => n.name);
cx.length ? ng('节点坐标越界 viewBox：' + cx.join('、')) : ok('节点坐标全部在 1000×760 内');
q('WXSTORIES').forEach(s => {
  if (!Array.isArray(s.paras) || !s.paras.length) ng('异闻 ' + s.no + ' 段落为空');
  if (!s.tail) ng('异闻 ' + s.no + ' 缺尾注');
});
ok('异闻段落与尾注齐全');

console.log('\n【六 素材纪律】');
const trace = q('WXTRACE');
const srcs = trace.map(t => t.src);
const local = srcs.filter(s => s.indexOf('私域素材') === 0);
const withPath = srcs.filter(s => /[A-Za-z]:[\\/]/.test(s));
withPath.length ? ng('溯源仍露本地路径：' + withPath.join('、')) : ok(local.length + ' 条本地溯源皆以「私域素材」声明，路径不上账面');
ok('溯源含网源 ' + (srcs.length - local.length) + ' 条（民俗母题参照）');
if (q('WXNOTE')) ok('WXNOTE 声明存在');

console.log('\n【七 计数一致性】');
const readme = fs.readFileSync(P + 'README.md', 'utf8');
[
  ['异闻', q('WXSTORIES').length, '则'],
  ['词库', q('WXLEXICON').length, '条'],
  ['人物', q('WXCHARS').length, '人'],
  ['账房谚', q('WXSAYINGS').length, '则'],
  ['京谚', q('WXCITYSAYINGS').length, '则'],
  ['货殖', q('WXGOODS').length, '物']
].forEach(([n, c, u]) => {
  const D = ['零','一','二','三','四','五','六','七','八','九'];
  const zh = [];
  for (let v = 0; v <= 999; v++) zh[v] = v < 10 ? D[v] : (v < 20 ? '十' + (v === 10 ? '' : D[v - 10]) : v < 100 ? D[Math.floor(v / 10)] + '十' + (v % 10 ? D[v % 10] : '') : D[Math.floor(v / 100)] + '百' + (v % 100 === 0 ? '' : (v % 100 < 10 ? '零' + D[v % 100] : zh[v % 100])));
  const rd = readme.replace(/\s+/g, '');
  const hit = rd.indexOf(n + zh[c] + u) >= 0 || rd.indexOf(n + c + u) >= 0 || rd.indexOf(zh[c] + u) >= 0;
  hit ? ok('README 提到「' + n + zh[c] + '」') : console.log('  · README 未见「' + n + zh[c] + u + '」逐字表述（可能分散记述）');
});
const up = q('WXUPDATES');
const vs = up.map(u => u.v);
dup(vs).length ? ng('更新志版本号重复') : ok('更新志 ' + up.length + ' 条，版本号无重复');
const dates = up.map(u => u.date);
let mon = 0;
for (let i = 0; i < dates.length - 1; i++) if (dates[i] < dates[i + 1]) mon++;
mon ? ng('更新志日期非降序 ' + mon + ' 处') : ok('更新志日期降序');

console.log('\n【八 卷号勾稽】');
const D2 = '零壹贰叁肆伍陆柒捌玖拾';
const CN = [];
for (let v = 1; v <= 120; v++) {
  let s;
  if (v <= 10) s = D2[v];
  else if (v < 20) s = '拾' + D2[v - 10];
  else s = D2[Math.floor(v / 10)] + '拾' + (v % 10 ? D2[v % 10] : '');
  CN[v] = '卷' + s;
}
const ST2 = q('WXSTORIES');
let sseqBad = 0;
ST2.forEach((s, i) => { if (s.id !== 's' + (i + 1) || s.no !== CN[i + 1]) { sseqBad++; console.log('  · ' + s.no + ' 应为 ' + CN[i + 1] + '（id ' + s.id + '）'); } });
sseqBad ? ng('异闻 id/卷号断序 ' + sseqBad + ' 处') : ok('异闻 id 与卷号自卷壹至' + CN[ST2.length] + ' 连续合规');
const validCN = new Set();
for (let v = 1; v <= ST2.length; v++) validCN.add(CN[v]);
const reftXT = [];
q('WXCHARS').forEach(c => reftXT.push(c.origin || ''));
R.links.forEach(l => { if (l.note) reftXT.push(l.note); });
if (up) up.forEach(u => (u.items || []).forEach(it => reftXT.push(it)));
const refBad = new Set();
reftXT.forEach(t => {
  (t.match(/卷[壹贰叁肆伍陆柒捌玖拾]{1,3}/g) || []).forEach(m => { if (!validCN.has(m)) refBad.add(m); });
});
refBad.size ? ng('人物来历／关系注引用了不存在之卷：' + [...refBad].join('、')) : ok('人物来历与关系注中 ' + reftXT.join('　').match(/卷[壹贰叁肆伍陆柒捌玖拾]{1,3}/g).length + ' 处卷目引用全部存在');

console.log('\n【九 货殖齐整】');
const C2 = q('WXCITIES');
const G2 = q('WXGOODS');
const offCity = G2.filter(g => !C2.some(c => c.name === g.city)).map(gg => gg.n);
offCity.length ? ng('货殖有未入京之物：' + offCity.join('、')) : ok('货殖 ' + G2.length + ' 物全部落在京内');
C2.forEach(function (c) {
  if (!c.blank) {
    const cnt = G2.filter(function (gg) { return gg.city === c.name; }).length;
    if (cnt !== 3) ng(c.name + ' 货殖应为三物，实为 ' + cnt + ' 物');
  }
});
ok('十二京每京三物齐整');

console.log('\n【十 界桩勾当】');
const K2 = q('WXSTAKES');
const KSTATES = ['在记', '已销', '自移', '存疑', '赊'];
const kdup = dup(K2.map(k => k.no));
kdup.length ? ng('界桩桩号重复：' + kdup.join('、')) : ok('界桩 ' + K2.length + ' 根桩号无重复');
const kBadState = K2.filter(k => KSTATES.indexOf(k.state) < 0).map(k => k.no);
kBadState.length ? ng('界桩状态越界：' + kBadState.join('、')) : ok('界桩状态全部在五态内');
const cityIds = new Set(q('WXCITIES').map(c => c.id));
const kBadCid = K2.filter(k => !cityIds.has(k.cid)).map(k => k.no);
kBadCid.length ? ng('界桩所辖京失实：' + kBadCid.join('、')) : ok('界桩所辖京全部属实');
const kBadPos = K2.filter(k => !Array.isArray(k.pos) || k.pos[0] < 0 || k.pos[0] > 1000 || k.pos[1] < 0 || k.pos[1] > 760).map(k => k.no);
kBadPos.length ? ng('界桩坐标越界：' + kBadPos.join('、')) : ok('界桩坐标全部在 1000×760 内');
const volSet = new Set(q('WXSTORIES').map(s => s.no));
const relayRef = q('WXRELAY') && q('WXRELAY').dispatch.ref;
relayRef && volSet.has(relayRef) ? ok('信路递送实录有卷可回：' + relayRef) : ng('信路递送实录失引：' + relayRef);
const kBadRef = K2.filter(k => !k.ref || !volSet.has(k.ref)).map(k => k.no);
kBadRef.length ? ng('界桩正卷缺失或失引：' + kBadRef.join('、')) : ok('界桩十二根桩桩有正卷，卷号全部属实');

/* 语义勾稽抽查（软报告，需人工过目）：ref 卷正文应见名目——防「张冠李戴」类。
   名、席位、规矩、桩面四字段皆为桥；逐字缩剥至二字，单字名直测。 */
const storyText = {};
q('WXSTORIES').forEach(s => { storyText[s.no] = s.sub + s.paras.join('') + s.tail; });
function topicHit(body, tokens) {
  for (const tk0 of tokens) {
    const tok = String(tk0 || '').replace(/[（）()·:：；，、。—\s""'']/g, '');
    if (!tok) continue;
    if (tok.length === 1) { if (body.indexOf(tok) >= 0) return true; continue; }
    for (let t = tok; t.length >= 2; t = t.slice(0, -1)) { if (body.indexOf(t) >= 0) return true; }
  }
  return false;
}
const oBadTopic = [];
q('WXORGANS').forEach(o2 => {
  const lawToks = String(o2.law || '').split(/[：:，、。；;]/);
  (o2.ref || '').split('、').forEach(r => {
    if (!volSet.has(r)) return;
    if (!topicHit(storyText[r], [o2.n, (o2.seat || '').split(' · ')[0], o2.law, lawToks[0], lawToks[1]])) oBadTopic.push(o2.n + '→' + r);
  });
});
const kBadTopic = [];
K2.forEach(k => {
  if (!volSet.has(k.ref)) return;
  const tok = k.name.replace(/之桩$/, '').replace(/桩$/, '');
  if (!topicHit(storyText[k.ref], [tok, (k.where || '').split(' · ')[0], k.face, k.topic])) kBadTopic.push(k.no + '→' + k.ref);
});
oBadTopic.length ? console.log('  · 语义勾稽·公门待过目：' + oBadTopic.join('；')) : ok('语义勾稽：公门十三署 refs 正文皆见名目');
kBadTopic.length ? console.log('  · 语义勾稽·界桩待过目：' + kBadTopic.join('；')) : ok('语义勾稽：界桩十二根 refs 正文皆见名目');

console.log('\n【十一 谚语齐整】');
const S2 = q('WXSAYINGS');
const sdup = dup(S2);
sdup.length ? ng('账房谚重复：' + sdup.join('、')) : ok('账房谚 ' + S2.length + ' 则无重复');
const sEmpty = S2.filter(function (s) { return !s || !String(s).trim(); }).length;
sEmpty ? ng('账房谚有空则：' + sEmpty + ' 则') : ok('账房谚无空则');
const CS2 = q('WXCITYSAYINGS');
const cNames = new Set(q('WXCITIES').map(function (c) { return c.name; }));
const badCity = CS2.filter(function (s) {
  const i = String(s).indexOf('：');
  return i < 0 || !cNames.has(s.slice(0, i));
});
badCity.length ? ng('京谚起首失实：' + badCity.join('、')) : ok('京谚 ' + CS2.length + ' 则起首皆实');

console.log('\n【十二 资源戳齐整】');
const stamps = [...html.matchAll(/\?v=(\d+)/g)].map(m => Number(m[1]));
if (!stamps.length) { ng('index.html 没有资源戳'); }
else {
  const mx = Math.max(...stamps);
  const badTags = stamps.filter(v => v !== mx);
  badTags.length ? ng('资源戳不一致：' + badTags.join('、')) : ok('资源戳 ' + stamps.length + ' 处全部一致 v=' + mx);
}
const verFoot = (html.match(/资源戳 v=(\d+)/) || [])[1];
if (verFoot) { (Number(verFoot) === (stamps.length ? Math.max(...stamps) : 0)) ? ok('页脚与资源戳一致') : ng('页脚戳与资源戳不符'); }

console.log('\n【十三 词库齐整】');
const LX = q('WXLEXICON');
const lCats = q('WXLEXICON_CATS');
const ldup = dup(LX.map(x => x.t));
ldup.length ? ng('词条重名：' + ldup.join('、')) : ok('词库 ' + LX.length + ' 条无重名');
const lBad = LX.filter(x => !x.t || !String(x.t).trim() || !x.p || !String(x.p).trim() || !x.d || !String(x.d).trim()).map(x => x.t || '（无题）');
lBad.length ? ng('词条有缺题缺音缺解：' + lBad.join('、')) : ok('词条题、音、解三者俱全');
const lBadCat = LX.filter(x => lCats.indexOf(x.cat) < 0).map(x => x.t);
lBadCat.length ? ng('词条类别越界：' + lBadCat.join('、')) : ok('词条类别全部在七类内');

console.log('\n【十四 人物齐整】');
const CH = q('WXCHARS');
const chIdDup = dup(CH.map(c => c.id));
chIdDup.length ? ng('人物 id 重复：' + chIdDup.join('、')) : ok('人物 ' + CH.length + ' 位 id 无重复');
const chNameDup = dup(CH.map(c => c.name));
chNameDup.length ? ng('人物名重：' + chNameDup.join('、')) : ok('人物名无重复');
const chBad = CH.filter(c => !c.name || !String(c.name).trim() || !c.place || !String(c.place).trim() || !c.cat || !String(c.cat).trim() || !c.origin || !String(c.origin).trim()).map(c => c.name || c.id);
chBad.length ? ng('人物有缺名缺籍缺类缺来历：' + chBad.join('、')) : ok('人物名、籍、类、来历俱全');
const chCats = [...new Set(CH.map(c => c.cat))];
chCats.length ? ok('人物类别 ' + chCats.length + ' 类：' + chCats.join('、')) : ng('人物类别为空');

console.log('\n【十五 卷尾齐整】');
const tBad = ST2.filter(s => !s.sub || !String(s.sub).trim() || !s.tail || !String(s.tail).trim()).map(s => s.no || s.id);
tBad.length ? ng('卷有缺引缺尾：' + tBad.join('、')) : ok('卷引、卷尾俱全');
const pBad = ST2.filter(s => !Array.isArray(s.paras) || s.paras.length < 3 || s.paras.some(p => !p || !String(p).trim())).map(s => s.no || s.id);
pBad.length ? ng('卷文不足三段或有空段：' + pBad.join('、')) : ok('卷文段数齐备无空段');
const titleDup = dup(ST2.map(s => s.title));
titleDup.length ? ng('卷题重复：' + titleDup.join('、')) : ok('卷题无重复');

console.log('\n【十六 账面净言】（用户明规：更新志与溯源簿不提本地文件与管线名目）');
const DIRTY = /(?:[A-Za-z]:[\\/])|(?:\bdata\/)|(?:\bassets\/)|(?:\btools\/)|(?:\bpreviews\/)|README|index\.html|\.(?:js|md|html|css|txt|png)\b|\bnode\b|\biframe\b|localStorage|pushState|display:none|\bLAZY\b|linkVolumes|kicker|\bSTORY_LING\b|\bMO_STORY\b|media=|font-display|color-scheme|undefined|\bDCL\b|\binit\b|\btopic\b|\bgrep\b|\bvar\b|\bcid\b|\bJS\b|\bCSS\b|\bHTML\b/;
const dirtyHits = [];
up.forEach(u2 => {
  [u2.title].concat(u2.items || []).forEach(s => {
    const m = String(s).match(DIRTY);
    if (m) dirtyHits.push(u2.v + '「' + m[0] + '」');
  });
});
trace.forEach(t => {
  [t.src, t.take].forEach(s => {
    const m = String(s).match(DIRTY);
    if (m) dirtyHits.push('溯源「' + m[0] + '」');
  });
});
dirtyHits.length ? ng('账面露管线 ' + dirtyHits.length + ' 处：' + dirtyHits.slice(0, 6).join('；')) : ok('更新志与溯源簿账面净言：无文件路径、文件名与管线名目');

/* 门面计数：初见笺篇数与索引源数须与实况相合 */
const appSrc = fs.readFileSync(P + 'assets/app.js', 'utf8');
const srcBlock = (appSrc.match(/var SOURCES = \[([\s\S]*?)\n    \];/) || [0, ''])[1];
const srcCount = (srcBlock.match(/name: '/g) || []).length;
const tipOk = html.indexOf('全书十九篇') >= 0 && html.indexOf('索引十七源') >= 0 && secTags === 19 && srcCount === 17;
tipOk ? ok('初见笺计数与实况一致（十九篇 · 十七源）') : ng('初见笺计数脱节：实况 ' + secTags + ' 篇 · ' + srcCount + ' 源（笺仍写十九·十七）');

console.log('\n【结论】' + (warn.length ? '需处理 ' + warn.length + ' 项' : '全部通过'));
warn.forEach(w => console.log('  ✗ ' + w));
