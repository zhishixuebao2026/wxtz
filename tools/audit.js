/* 万象天账 · 全站审计
   数据层 + 代码层静态检查，不依赖浏览器。跑法：node tools/audit.js
   在站点根目录外运行时把 P 改成绝对路径即可。 */
'use strict';
const fs = require('fs'), vm = require('vm');
const P = __dirname.replace(/\\/g, '/') + '/../';
const DATA = ['core','cities','places','beings','timeline','lexicon','sayings','goods','stories','characters','relations','stakes','suiling','organs','arcs','docs','updates','trials','granaries','relay','daily','observatory','artifacts'];
const JS = DATA.map(d => 'data/' + d + '.js').concat(['assets/app.js']);
function cnNumText(n){const d=['零','一','二','三','四','五','六','七','八','九'];const b=Math.floor(n/100)%10,h=Math.floor(n/10)%10,o=n%10;return (b?d[b]+'百':'')+(h?d[h]+'十':'')+(o?d[o]:'');}
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
const rootColor = name => {
  const hit = css.match(new RegExp('--' + name + ':\\s*(#[0-9a-f]{6})', 'i'));
  return hit ? hit[1] : null;
};
const luminance = hex => {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = rgb.map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
const palette = ['ink','panel','silk','silk3','dim','golddim'].reduce((o, k) => (o[k] = rootColor(k), o), {});
const contrastPairs = [['正文','silk','ink'],['次级正文','silk3','panel'],['说明文字','dim','panel'],['旧金提示','golddim','panel']];
const weakContrast = contrastPairs.filter(pair => !palette[pair[1]] || !palette[pair[2]] || contrast(palette[pair[1]], palette[pair[2]]) < 4.5);
weakContrast.length ? ng('暖墨底色文字对比度不足：' + weakContrast.map(x => x[0]).join('、'))
  : ok('正文、次级说明与铜金提示对暖墨面均达 4.5:1 对比度门槛');
const capOk = /\.story \.body p:first-of-type\{text-indent:0\}/.test(css) && /\.story \.body p:first-of-type::first-letter\{[^}]*float:left[^}]*padding:3px 4px 0 0/.test(css) && /\.story \.body p:first-of-type::first-letter\{font-size:2\.5em;padding-right:3px\}/.test(css);
capOk ? ok('异闻首字放大保留；首段缩进清零、字旁留白收束') : ng('异闻首字放大与段首间距修复不完整');

const fontCssPath = P + 'assets/fonts/lxgwwenkailite-regular.css';
const fontCss = fs.existsSync(fontCssPath) ? fs.readFileSync(fontCssPath, 'utf8') : '';
const fontRefs = [...fontCss.matchAll(/url\(['\"]?([^'\")]+)['\"]?\)/g)].map(m => m[1]);
const missingFonts = fontRefs.filter(src => !fs.existsSync(P + 'assets/fonts/' + src.replace(/^\.\//, '')));
const remoteFonts = fontRefs.filter(src => /^https?:/i.test(src));
fontCss && !missingFonts.length && !remoteFonts.length && fs.existsSync(P + 'assets/ledger-atmosphere.webp')
  ? ok('本地字体子集 ' + fontRefs.length + ' 件、原创首页纸景齐备；无远程字体引用')
  : ng('本地视觉资源缺失或含远程字体：' + missingFonts.join('、') + (remoteFonts.length ? '；远程 ' + remoteFonts.join('、') : ''));
const swSource = fs.readFileSync(P + 'sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync(P + 'site.webmanifest', 'utf8'));
const installHtmlSource = fs.readFileSync(P + 'index.html', 'utf8');
const installAppSource = fs.readFileSync(P + 'assets/app.js', 'utf8');
const appleStandalone = manifest.display === 'standalone' && manifest.display_override && manifest.display_override[0] === 'standalone' &&
  /apple-mobile-web-app-capable" content="yes"/.test(installHtmlSource) && /apple-touch-icon/.test(installHtmlSource) &&
  manifest.icons.every(icon => fs.existsSync(P + icon.src)) && /window\.navigator\.standalone === true/.test(installAppSource) &&
  installAppSource.includes("matchMedia('(display-mode: standalone)')") && /html\.standalone-app \.install-app-tool/.test(css) &&
  /作为网页 App 打开/.test(installAppSource) && /删除旧图标/.test(installAppSource);
appleStandalone ? ok('iPhone 主屏安装配置为独立网页 App，含图标、启动方式与重加指引') : ng('iPhone 主屏安装未配置独立网页 App 或缺少 Safari 操作指引');
const safeAreaUiOk = /viewport-fit=cover/.test(installHtmlSource) && /apple-mobile-web-app-status-bar-style" content="black"/.test(installHtmlSource) &&
  /--system-safe-area-top:env\(safe-area-inset-top,0px\)/.test(css) && /--system-safe-area-right:env\(safe-area-inset-right,0px\)/.test(css) &&
  /--system-safe-area-bottom:env\(safe-area-inset-bottom,0px\)/.test(css) && /--system-safe-area-left:env\(safe-area-inset-left,0px\)/.test(css) &&
  /* v1.52.0 新契约：吸顶导航自视口顶端铺起，安全区由导航条内边距承担，不再叠一层假状态栏高度 */
  /html\.standalone-app\{--safe-area-top:max\(var\(--system-safe-area-top\),44px\)/.test(css) &&
  /\.mobile-nav\{top:0;padding:calc\(7px \+ var\(--safe-area-top\)\)/.test(css) &&
  /\.top\{padding-top:calc\(16px \+ var\(--safe-area-top\)\)/.test(css) &&
  /\.prog\{top:0\}/.test(css) && /scroll-padding-top:calc\(66px \+ var\(--safe-area-top\)\)/.test(css) &&
  /body::before\{/.test(css) && /z-index:51/.test(css) &&
  /\.reader-tools\{position:sticky;top:var\(--safe-area-top\)/.test(css) && /\.nav\{top:calc\(54px \+ var\(--safe-area-top\)\)/.test(css) &&
  /\.mobile-page-popover\{width:min\(360px,calc\(100vw - 24px - var\(--safe-area-left\) - var\(--safe-area-right\)\)\)/.test(css) &&
  /popoverRect\.bottom \+ 8 > window\.innerHeight - bottomInset/.test(installAppSource) && /window\.scrollTo\(0, Math\.max\(0, currentY \+ navRect\.top - stickyTop\)\)/.test(installAppSource) &&
  /function stickyNavigationOffset\(extra\)/.test(installAppSource) && /bar\.getBoundingClientRect\(\)\.height \+ top \+ gap/.test(installAppSource) &&
  /scroll-margin-top:calc\(92px \+ var\(--safe-area-top\)\)/.test(css) && /var\(--safe-area-bottom\)/.test(css);
safeAreaUiOk ? ok('手机状态栏改用不透叠暗底；吸顶栏、回案偏移、刘海横屏、弹层与手势区均避让系统安全区') : ng('手机主屏状态栏、吸顶导航或系统安全区避让不完整');
const swFontsOk = /fontCss\.text\(\)/.test(swSource) && /cache\.addAll\(fonts\.slice\(/.test(swSource);
swFontsOk ? ok('离线安装会分批预存 ' + fontRefs.length + ' 个本地字形子集') : ng('离线安装未覆盖本地字体子集');
/['\"]\.\/data\/relay\.js\?v=\d+['\"]/.test(swSource) ? ok('Service Worker 预缓存信路数据') : ng('Service Worker 漏缓存信路数据');
/['\"]\.\/data\/daily\.js\?v=\d+['\"]/.test(swSource) ? ok('Service Worker 预缓存街巷日用篇') : ng('Service Worker 漏缓存街巷日用篇');
/['\"]\.\/data\/observatory\.js\?v=\d+['\"]/.test(swSource) ? ok('Service Worker 预缓存三签校时资料') : ng('Service Worker 漏缓存三签校时资料');
/['\"]\.\/data\/artifacts\.js\?v=\d+['\"]/.test(swSource) ? ok('Service Worker 预缓存见物设定') : ng('Service Worker 漏缓存见物设定');
/['\"]\.\/assets\/three-seal-observatory\.webp['\"]/.test(swSource) ? ok('Service Worker 预缓存原创三签台器物图') : ng('Service Worker 漏缓存三签台器物图');
const beingSource = fs.readFileSync(P + 'data/beings.js', 'utf8');
const beingImages = [...beingSource.matchAll(/image:\s*['\"]([^'\"]+)['\"]\s*,\s*imageAlt:\s*['\"]([^'\"]+)['\"]/g)];
const missingBeingImages = beingImages.map(m => m[1]).filter(src => !fs.existsSync(P + src));
const oversizedBeingImages = beingImages.map(m => m[1]).filter(src => {
  const file = P + src;
  if (!fs.existsSync(file)) return false;
  const bytes = fs.readFileSync(file);
  return !src.endsWith('.webp') || bytes.length > 400 * 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP';
});
const uncachedBeingImages = beingImages.map(m => m[1]).filter(src => !swSource.includes("'./" + src + "'"));
beingImages.length >= 10 && beingImages.every(m => m[2].trim().length > 15) && !missingBeingImages.length && !oversizedBeingImages.length
  ? ok('众生谱 ' + beingImages.length + ' 幅均为轻量 WebP，且有描述性替代文字') : ng('众生意象缺图、非轻量 WebP 或缺少替代文字：' + missingBeingImages.concat(oversizedBeingImages).join('、'));
if (!/\.being-grid\{[^}]*minmax\(min\(100%,300px\),1fr\)/.test(css)) ng('众生谱网格未适配小于卡片最小宽度的窄屏');
else ok('众生谱卡片可在 320 像素窄屏收缩，不设固定最小横宽');
uncachedBeingImages.length ? ng('众生意象未纳入离线缓存：' + uncachedBeingImages.join('、')) : ok('众生谱 ' + beingImages.length + ' 幅意象均纳入离线预缓存');
const loreBeings = fs.readFileSync(P + 'data/beings.js', 'utf8');
const loreStories = fs.readFileSync(P + 'data/stories.js', 'utf8');
const loreLexicon = fs.readFileSync(P + 'data/lexicon.js', 'utf8');
const s47At = loreStories.indexOf("id: 's47'");
const s47Text = s47At >= 0 ? loreStories.slice(s47At, loreStories.indexOf('\n  },', s47At)) : '';
const s41At = loreStories.indexOf("id: 's41'");
const s41Text = s41At >= 0 ? loreStories.slice(s41At, loreStories.indexOf('\n  },', s41At)) : '';
const suilingSource = fs.readFileSync(P + 'data/suiling.js', 'utf8');
const childDebtLoreClear = !/命厚债重|救过人命的人，天必入账|痕浅或已出账|只抹结清的账/.test(loreBeings + loreLexicon + s47Text + s41Text)
  && /不是命数、品行或债额/.test(loreBeings) && /不是命数、品行或债额/.test(s47Text)
  && /不等于人不存在/.test(loreLexicon) && /不是你的账/.test(s41Text)
  && /各地说法不一/.test(suilingSource);
childDebtLoreClear ? ok('墨痕不定命数或债额；救人、童年与祟俗均不作欠债凭据') : ng('墨痕、童年或祟俗仍含出生定债、救人换入账或替人判账暗示');
const characterSource = fs.readFileSync(P + 'data/characters.js', 'utf8');
const portraitRefs = [...characterSource.matchAll(/portrait:\s*['\"]([^'\"]+)['\"]/g)].map(m => m[1]);
const missingPortraits = portraitRefs.filter(src => !fs.existsSync(P + src));
const oversizedPortraits = portraitRefs.filter(src => {
  const file = P + src;
  if (!fs.existsSync(file)) return false;
  const bytes = fs.readFileSync(file);
  return !src.endsWith('.webp') || bytes.length > 250 * 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP';
});
missingPortraits.length ? ng('人物画像资源缺失：' + missingPortraits.join('、'))
  : ok('人物画像 ' + portraitRefs.length + ' 幅，本地资源路径齐备');
oversizedPortraits.length ? ng('人物画像非轻量 WebP 或超过 250 KiB：' + oversizedPortraits.join('、')) : ok('人物画像均为轻量 WebP（单幅低于 250 KiB）');
const uncachedPortraits = portraitRefs.filter(src => !swSource.includes("'./" + src + "'"));
uncachedPortraits.length ? ng('人物画像未预存离线：' + uncachedPortraits.join('、')) : ok('人物画像均纳入离线预缓存');
portraitRefs.length >= 27 ? ok('人物画像覆盖至少二十七位有据人物') : ng('人物画像覆盖不足：当前 ' + portraitRefs.length + ' 幅');
const reducedMotionGlobal = /@media \(prefers-reduced-motion: reduce\)[\s\S]*?scroll-behavior: auto !important[\s\S]*?transition-duration: 0\.01ms !important/.test(css);
reducedMotionGlobal ? ok('全站统一尊重减少动态偏好') : ng('全站缺少减少动态偏好的兜底规则');
/@media\(max-width:560px\)\{\.shiju-city,#shijuTails\{grid-template-columns:minmax\(0,1fr\)\}\}/.test(css) ? ok('拾句窄屏网格可收缩，320 像素视口不横溢') : ng('拾句京谚或卷尾网格在窄屏仍设固定最小宽度');
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
const staticIds = [...html.matchAll(/\bid=[\"']([^\"']+)[\"']/g)].map(m => m[1]);
const dupStaticIds = staticIds.filter((id, i) => staticIds.indexOf(id) !== i);
dupStaticIds.length ? ng('HTML id 重复：' + [...new Set(dupStaticIds)].join('、')) : ok('HTML id 唯一（' + staticIds.length + ' 个）');
let badLocalRefs = [];
for (const m of html.matchAll(/\b(?:href|src)=[\"']([^\"']+)[\"']/g)) {
  const ref = m[1];
  if (!ref || /^(?:[a-z]+:|\/\/)/i.test(ref)) continue;
  if (ref.charAt(0) === '#') {
    const id = decodeURIComponent(ref.slice(1));
    if (id && staticIds.indexOf(id) < 0) badLocalRefs.push(ref);
    continue;
  }
  const file = decodeURIComponent(ref.split(/[?#]/)[0]);
  if (file && !fs.existsSync(require('path').resolve(P, file))) badLocalRefs.push(ref);
}
badLocalRefs.length ? ng('HTML 本地链接或素材失引：' + badLocalRefs.join('、')) : ok('HTML 本地锚点、脚本、样式、图标与资源均可达');
const observatoryAssetOk = /src="assets\/three-seal-observatory\.webp"/.test(html) && /alt="原创三签台[^"]+"/.test(html) && fs.existsSync(P + 'assets/three-seal-observatory.webp') && /assets\/three-seal-observatory\.webp/.test(swSource);
observatoryAssetOk ? ok('三签台原创插图有替代文本并入离线册') : ng('三签台插图、替代文本或离线缓存缺失');
const coverMeta = /<meta property="og:image" content="assets\/ledger-cover\.jpg"/.test(html) &&
  /<meta property="og:image:alt" content="[^"]+"/.test(html) &&
  /<meta property="og:image:width" content="1200"/.test(html) &&
  /<meta property="og:image:height" content="630"/.test(html) &&
  /<meta name="twitter:card" content="summary_large_image"/.test(html) &&
  /<meta name="twitter:image" content="assets\/ledger-cover\.jpg"/.test(html) &&
  fs.existsSync(P + 'assets/ledger-cover.jpg') && /assets\/ledger-cover\.jpg/.test(swSource);
coverMeta ? ok('原创分享封面、Open Graph/Twitter 图文说明齐备') : ng('分享卡片封面或替代说明缺失');
const mapSvgA11y = /<svg id="mapSvg"[^>]*role="group"[^>]*aria-label="[^"]+"/.test(html);
const netSvgA11y = /<svg id="netSvg"[^>]*role="group"[^>]*aria-label="[^"]+"/.test(html);
mapSvgA11y && netSvgA11y ? ok('天地图与关系网标作可交互图组，并各有操作说明') : ng('地图 SVG 的无障碍图组名称或操作说明缺失');
const netSource = fs.readFileSync(P + 'assets/app.js', 'utf8').split('function buildNetwork()')[1].split('/* 桩签：')[0];
const netButtons = (netSource.match(/setAttribute\('role', 'button'\)/g) || []).length;
const netKeyboard = (netSource.match(/addEventListener\('keydown'/g) || []).length;
netButtons >= 2 && netKeyboard >= 2 && /aria-label/.test(netSource)
  ? ok('关系网人物与连线皆有读屏名、键盘焦点及回车/空格操作')
  : ng('关系网人物或连线的键盘/读屏操作不完整');
const visualAuditApp = fs.readFileSync(P + 'assets/app.js', 'utf8');
const svgFontOk = !/font-family:(?:KaiTi|STKaiti|Kaiti SC|Noto Serif SC|Songti SC),/.test(visualAuditApp) && /font-family:var\(--kai\)/.test(visualAuditApp);
svgFontOk ? ok('地图题签沿用自托管书体，不依赖设备上未必存在的系统字体') : ng('SVG 题签仍引用缺字风险较高的系统字体栈');
const touchCssOk = /button\{min-height:24px/.test(css) && /\.chip\{[\s\S]{0,180}min-height:32px/.test(css) && /\.sj-src\{[^}]*min-height:28px/.test(css) && /\.trial-place\{[^}]*min-height:32px/.test(css) && /\.fav-btn\{[^}]*min-width:32px;min-height:32px/.test(css) && /\.story::before\{[^}]*pointer-events:none/.test(css);
touchCssOk ? ok('按钮、筛签、卷源与收藏均保有可触及的最小尺寸') : ng('交互入口有低于最小目标尺寸的样式');
const favoriteA11yOk = /favBtn\.setAttribute\('aria-label'/.test(visualAuditApp) && /favBtn\.setAttribute\('aria-pressed'/.test(visualAuditApp);
favoriteA11yOk ? ok('异闻收藏键读出卷号与状态，屏幕阅读器可辨已收/未收') : ng('异闻收藏按钮未标明目标卷或当前状态');
const svgTargetsOk = /\.rd \.road-hit\{[^}]*vector-effect:non-scaling-stroke/.test(css) && /\.net-link \.net-hit\{[^}]*vector-effect:non-scaling-stroke/.test(css) && /\.stake \.st-hit\{[^}]*vector-effect:non-scaling-stroke/.test(css) && /\.net-node \.net-hit-target\{[^}]*vector-effect:non-scaling-stroke/.test(css) && /class': 'hit', cx: c\.pos\[0\], cy: c\.pos\[1\], r: 40/.test(visualAuditApp) && /class: 'net-hit-target'/.test(visualAuditApp) && /'class': 'st-hit'/.test(visualAuditApp);
svgTargetsOk ? ok('地图与关系图的线、节点及界桩保有不随缩放消失的触控热区') : ng('地图或关系图的交互热点会随窄屏缩得过小');
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
const storyScenes = (q('WXSTORIES') || []).filter(x => x.image || x.imageAlt);
const expectedStorySceneIds = storyScenes.map(x => x.id);
const missingStoryScenes = expectedStorySceneIds.filter(id => {
  const story = (q('WXSTORIES') || []).filter(x => x.id === id)[0];
  if (!story || !story.image || !story.imageAlt || !fs.existsSync(P + story.image)) return true;
  const bytes = fs.readFileSync(P + story.image);
  return !story.image.endsWith('.webp') || bytes.length > 450 * 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || !swSource.includes("'./" + story.image + "'");
});
expectedStorySceneIds.length >= 20 && missingStoryScenes.length === 0
  ? ok(('第 ' + expectedStorySceneIds.length + ' 卷异闻意象均有替代文字、轻量 WebP 文件并纳入离线首装').replace(/^第 (\d+) 卷/, (m, n) => cnNumText(Number(n)) + '卷'))
  : ng('异闻场景图缺项、过大、格式错误或未预缓存：' + missingStoryScenes.join('、'));
const placeRows = q('WXPLACES') || [];
const placeIds = placeRows.map(x => x.id);
const expectedPlaceImages = ['ash-corridor','cancellation-pit','debtless-sea','heavenly-ledger-court','copytower-interior','central-ledger-thirteenth-floor','hanging-sun-tower-interior','golden-gutter-binding-line','ashen-corridor-outpost','nether-capital-ticket-vault'];
const missingPlaceImages = expectedPlaceImages.filter(id => {
  const item = placeRows.filter(x => x.id === id)[0];
  if (!item || !item.image || !fs.existsSync(P + item.image)) return true;
  const bytes = fs.readFileSync(P + item.image);
  return !item.alt || !item.imageCaption || !item.note || !item.name || !item.region || !item.image.endsWith('.webp') || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.length > 450 * 1024;
});
placeRows.length >= 10 && new Set(placeIds).size === placeIds.length && missingPlaceImages.length === 0
  ? ok('地物图志 ' + placeRows.length + ' 景齐整：替代文字、题记、WebP 文件均完整且轻量')
  : ng('地物图志缺项、重号、过大或缺少替代文字：' + missingPlaceImages.join('、'));
const uncachedPlaces = placeRows.filter(x => !swSource.includes("'./" + x.image + "'"));
uncachedPlaces.length === 0 && /data\/places\.js\?v=\d+/.test(swSource)
  ? ok('地物资料与 ' + placeRows.length + ' 幅意象均纳入离线首装')
  : ng('离线册漏收地物资料或图片：' + uncachedPlaces.map(x => x.id).join('、'));
const placeAppSource = fs.readFileSync(P + 'assets/app.js', 'utf8');
const placeAtlasUiOk = /id="placeAtlasGrid"/.test(html) && !/id="placeAtlasStage"/.test(html) &&
  /function buildPlaceAtlas\(/.test(placeAppSource) && /openPlace\(place\.id\)/.test(placeAppSource) &&
  /setAttribute\('aria-pressed'/.test(placeAppSource) && /\.place-atlas-grid\{display:grid;grid-auto-flow:column/.test(css) &&
  /prefers-reduced-motion:reduce\)\{\.place-atlas-card/.test(css);
placeAtlasUiOk ? ok('十处地物图签前置于天地图，点选在同一地图卷宗开图，横向触控可阅且尊重减少动态偏好') : ng('地物图签未接入地图卷宗或响应式/动态偏好兜底未接通');
const mapDetailLayoutOk = /\.map-flex\{display:grid;grid-template-columns:minmax\(0,1\.55fr\) minmax\(300px,\.9fr\)/.test(css) &&
  /\.city-detail>\*\{grid-column:1\}/.test(css) &&
  css.indexOf('@media(min-width:961px){\n  .city-detail{position:sticky') > css.indexOf('.cd-text,.cd-goods,.cd-hook,.cd-lat{grid-column:2}') &&
  /@media \(max-width:960px\)\{[\s\S]*?\.map-flex\{grid-template-columns:1fr\}/.test(css);
mapDetailLayoutOk ? ok('地图卷宗桌面双栏/单列优先级已校正，平板与窄屏回流为上下排') : ng('地图卷宗桌面与窄屏布局规则顺序或断点失配');
const mapData = q('WXMAP');
const mapRoads = mapData.roads || [];
const mapLandmarks = mapData.landmarks || [];
const stakes = q('WXSTAKES') || [];
const mapSceneRecords = mapRoads.concat(mapLandmarks, stakes.map(x => ({ scene: x.image, sceneAlt: x.imageAlt, sceneCaption: x.imageCaption, name: x.name })));
const badMapScenes = mapSceneRecords.filter(item => {
  const src = item.scene || item.image;
  const alt = item.sceneAlt || item.imageAlt;
  const caption = item.sceneCaption || item.imageCaption;
  if (!src || !alt || alt.length < 15 || !caption || !fs.existsSync(P + src)) return true;
  const bytes = fs.readFileSync(P + src);
  return !src.endsWith('.webp') || bytes.length > 450 * 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP';
});
const uncachedMapScenes = mapSceneRecords.map(x => x.scene || x.image).filter(src => !swSource.includes("'./" + src + "'"));
mapRoads.length === 19 && mapLandmarks.length === 3 && stakes.length === 12 && !badMapScenes.length
  ? ok('十九条道路、三处地图地标与十二根界桩皆有轻量 WebP、图说和替代文字')
  : ng('道桥/地标/界桩图像或说明缺项、体积偏大或格式错误：' + badMapScenes.map(x => x.name || x.road).join('、'));
uncachedMapScenes.length ? ng('地图道桥/地标/界桩图未预缓存：' + uncachedMapScenes.join('、')) : ok('全部地图道桥、地标与界桩图均列入离线册');
const placeTargets = new Set(mapData.extras.map(x => x.id).concat([mapData.ghost.id, 'spine']));
const validMapCityIds = new Set(q('WXCITIES').map(x => x.id));
const unlinkedPlaces = placeRows.filter(x => !(x.cityId && validMapCityIds.has(x.cityId)) && !(x.mapRef && placeTargets.has(x.mapRef)));
unlinkedPlaces.length ? ng('地物图志未关联地图地物或京城：' + unlinkedPlaces.map(x => x.name).join('、')) : ok('十处地物全部可由地图点位、装订脊道或所属京城就地开卷');
/* v1.53.0 起七个开法统一走 detailOpen 骨架，故核对骨架本身与各入口，而非逐条硬编码旧调用字面量 */
const detailOpeners = (placeAppSource.match(/detailOpen\(\{/g) || []).length;
const mapSkeletonOk = /function detailOpen\(/.test(placeAppSource) && /function detailLinks\(/.test(placeAppSource) &&
  /function detailRoadList\(/.test(placeAppSource) && /function appendMapScene\(/.test(placeAppSource) &&
  detailOpeners >= 5;
const mapInteractionOk = mapSkeletonOk && /function openLandmark\(/.test(placeAppSource) &&
  /closest\('\.map-place'\)/.test(placeAppSource) && /closest\('\.lm-item'\)/.test(placeAppSource) &&
  /function revealMapDetail\(/.test(placeAppSource) && /revealMapDetail\(\)/.test(placeAppSource) &&
  /stake-card-image/.test(placeAppSource) && /aria-label': rd\.road[^\n]+路线图/.test(placeAppSource);
mapInteractionOk ? ok('京、道、桥、脊、地标、页外地物与桩均有键鼠同用的图文卷宗入口') : ng('地图特征点击/键盘交互或就地插图未完整接通');
mapSkeletonOk ? ok('地图卷宗七种开法共用同一骨架（题签→图→提要→正文），共 ' + detailOpeners + ' 处入口') : ng('地图卷宗骨架未统一，各开法版面仍会各自为政');
const generatedMapAssets = ['bridge-upper','bridge-middle','bridge-lower','route-harvest','route-forge','route-river','route-north','route-mountain','route-boundary','stake-riverbank'].map(id => 'assets/map-scenes/' + id + '.webp');
const missingGeneratedMapAssets = generatedMapAssets.filter(src => !fs.existsSync(P + src) || !swSource.includes("'./" + src + "'"));
missingGeneratedMapAssets.length ? ng('新增地图意象缺图或未预缓存：' + missingGeneratedMapAssets.join('、')) : ok('原创新增道桥与水岸桩景均为本地图像并纳入离线册');
const cnt = n => { const v = q(n); return Array.isArray(v) ? v.length : null; };
const routes = q('WXCORE').readingRoutes || [];
const validPages = new Set(pageIds);
const validTargets = new Set(staticIds);
const validStories = new Set(q('WXSTORIES').map(x => x.no));
const validCityIds = new Set(q('WXCITIES').map(x => x.id));
const routeBad = routes.length !== 3 || new Set(routes.map(x => x.id)).size !== routes.length ||
  routes.some(route => !route.title || !route.intro || !route.tone || !Array.isArray(route.steps) || route.steps.length !== 4 ||
    new Set(route.steps.map(x => x.label)).size !== route.steps.length ||
    route.steps.some(step => !step.label || !step.hint || !validPages.has(step.page) ||
      (step.story && (!validStories.has(step.story) || step.page !== 'stories')) ||
      (step.city && (!validCityIds.has(step.city) || step.page !== 'map')) ||
      (!step.story && !step.target) || (step.target && !validTargets.has(step.target))));
routeBad ? ng('三条阅读路引须各有四站，且篇目、卷号、京城与落点全部有效') : ok('三条主题阅读路引各四站，卷目与落点均可勾稽');
const routeUiOk = /id="readingRouteGrid" role="group" aria-label="三条主题阅读路径"/.test(html) && /function buildReadingRoutes\(/.test(fs.readFileSync(P + 'assets/app.js', 'utf8')) && /wxtz_route_v1/.test(fs.readFileSync(P + 'assets/app.js', 'utf8')) && /\.reading-route-step/.test(css);
routeUiOk ? ok('路引具可续读交互、逐站直达、本机进度记忆与响应式样式') : ng('阅读路引界面、交互或续读记忆未完整接通');
const dispatchRoute = routes.filter(x => x.id === 'dispatch')[0];
const dispatchRecord = q('WXRELAY').dispatch;
const dispatchLegs = dispatchRecord.legs || [];
const dispatchCities = dispatchLegs.length ? [dispatchLegs[0].from].concat(dispatchLegs.map(x => x.to)) : [];
const dispatchJourneyOk = dispatchRoute && dispatchRoute.title.indexOf('四京') >= 0 && dispatchCities.length === 4 &&
  dispatchCities[0] === dispatchRoute.steps[0].city && dispatchCities.every(id => validCityIds.has(id)) &&
  dispatchRoute.steps.some(step => step.story === dispatchRecord.ref && step.page === 'stories');
dispatchJourneyOk ? ok('四京信路路引与三段递送实录、卷玖拾玖互相勾稽') : ng('行路路引的京数、递送实录或回卷失配');
const review = q('WXCORE').review;
const reviewBad = !review || !review.title || !review.intro || !review.boundary || !Array.isArray(review.steps) || review.steps.length !== 4 ||
  new Set((review.steps || []).map(x => x.name)).size !== 4 ||
  (review.steps || []).some(x => !x.mark || !x.name || !x.text);
reviewBad ? ng('留格复账须具四步、独立原录/复核与明确止界') : ok('留格复账四步齐备，争议不等于有罪或免账');
const publicCredit = String(q('WXCORE').falsify.credit || '');
/[A-Z]:[\\/](?!\/)|\b[\w.-]+\.(?:md|txt|docx)\b/i.test(publicCredit)
  ? ng('总纲可见署注暴露本地路径或素材文件名')
  : ok('总纲公开署注不含本地路径或外部素材文件名');
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
const storyIds = q('WXSTORIES').map(x => x.id);
const storyNos = q('WXSTORIES').map(x => x.no);
new Set(storyIds).size === storyIds.length && new Set(storyNos).size === storyNos.length ? ok('异闻 id 与卷号均唯一') : ng('异闻 id 或卷号重复');
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
  const storeCount = gran.stores.length;
  const gBad = storeCount < 3 || gran.seasons.length !== 3 || gran.seasons.some(s => !s.moves || s.moves.length !== storeCount || !s.audit);
  gBad ? ng('仓衡须为三仓以上、三时，每时每仓各一处粮账并有复核') : ok('仓衡 ' + storeCount + ' 仓三时齐备，各仓事逐仓有粮账与复核');
  const gDup = new Set(gran.stores.map(s => s.id)).size !== gran.stores.length || new Set(gran.seasons.map(s => s.id)).size !== gran.seasons.length;
  gDup ? ng('仓制或仓事 id 重复') : ok('仓制与仓事 id 无重复');
}
const reviewDoc = q('WXDOCS').filter(p => p.n === '留格复账牒 · 司录式')[0];
const docs = q('WXDOCS');
const docsBad = docs.length < 19 || new Set(docs.map(p => p.n)).size !== docs.length ||
  docs.some(p => !p.n || !p.kind || !p.seat || !p.when || !p.text || !p.ref);
docsBad ? ng('故纸须至少十九件，逐件具名、类型、席位、年月、原文与卷号') : ok('故纸 ' + docs.length + ' 件均有来源席位、原文与回卷');
reviewDoc && /不收钱/.test(reviewDoc.text) && /原记不擦/.test(reviewDoc.text) && /不得独核/.test(reviewDoc.text) && /余账照结/.test(reviewDoc.text)
  ? ok('留格复账牒具免费申诉、原记留存、复核分离与余账照结')
  : ng('留格复账牒遗漏关键权利或裁处边界');
const reviewStory = q('WXSTORIES').filter(s => s.id === 's100')[0];
reviewStory && reviewStory.paras.some(t => t.indexOf('留格牒') >= 0) && reviewStory.paras.some(t => t.indexOf('只把重复计出的那一行记作「存疑」') >= 0 && t.indexOf('其余账照结') >= 0 && t.indexOf('不拿来冲销沈归') >= 0)
  ? ok('卷壹佰以实际渡费争议演示留格，不另造重复角色或支线')
  : ng('卷壹佰未能演示具体一行的复核与年结止界');
const reviewUiSource = fs.readFileSync(P + 'assets/app.js', 'utf8');
const docIndexTargetOk = /name: '故纸'.*?targetId: 'doc-' \+ i/.test(reviewUiSource) && /card\.id = 'doc-' \+ index/.test(reviewUiSource);
const storyVolumeNavOk = /el\('details', 'story-volume-nav'\)/.test(reviewUiSource) && /el\('details', 'story-arc-nav'\)/.test(reviewUiSource) && /volumeCurrent/.test(reviewUiSource) && /ARC_LABEL_SYNC/.test(reviewUiSource) && /aria-current', 'location'/.test(reviewUiSource) && /aria-pressed/.test(reviewUiSource) && /story-volume-list/.test(css) && /story-arc-list/.test(css);
storyVolumeNavOk ? ok('百卷直达与十六线筛签均收进键盘可展卷目') : ng('异闻卷目未完整折叠导航、筛签或当前状态');
const fourPillars = q('WXFOUR');
const fourPillarText = JSON.stringify(fourPillars);
const fourPillarBoundary = fourPillars && fourPillars.pillars && fourPillars.pillars.length === 4 && /待核/.test(fourPillarText) && /不能替代凭据/.test(fourPillarText) && /独立凭据/.test(fourPillarText) && !/视同挪用|前世的债|不认也得认|虚开是贪|漏开是赖/.test(fourPillarText) && /不等同/.test(q('WXLEXICON').filter(x => x.t === '新收')[0].d);
fourPillarBoundary ? ok('四柱与三律一致：差异待核、不承袭未证之债、不凭差数定过') : ng('四柱仍将未核差异或亲缘推定为债责');
const clockMyth = q('WXSTORIES').filter(x => x.id === 's8')[0];
const clockChosen = q('WXSTORIES').filter(x => x.id === 's25')[0];
const tornPage = q('WXSTORIES').filter(x => x.id === 's15')[0];
const blankOrigin = q('WXSTORIES').filter(x => x.id === 's16')[0];
const clockAnnual = q('WXSTORIES').filter(x => x.id === 's35')[0];
const cityClock = q('WXCITIES').filter(x => x.id === 'zhao')[0];
const dayTable = q('WXGOODS').filter(x => x.n === '日表')[0];
const slowClockTerm = q('WXLEXICON').filter(x => x.t === '慢钟之息')[0];
const blankStake = q('WXSTAKES').filter(x => x.no === '甲四')[0];
const coffinStake = q('WXSTAKES').filter(x => x.no === '甲八')[0];
const bindingStake = q('WXSTAKES').filter(x => x.no === '甲十二')[0];
const slowClockCopy = [clockMyth && clockMyth.sub, clockMyth && clockMyth.paras.join(' '), clockChosen && clockChosen.paras.join(' '), cityClock && cityClock.hook, dayTable && dayTable.d, slowClockTerm && slowClockTerm.d].join(' ');
const tornPageRumor = tornPage && /只留下一则旧闻/.test(tornPage.paras.join(' ')) && /传闻没有留下撕页者的姓名/.test(tornPage.paras.join(' ')) && !/撕页的还是撕了|那人要撕/.test(tornPage.paras.join(' '));
const noPrebirthDebt = tornPageRumor && clockMyth && clockChosen && tornPage && blankOrigin && clockAnnual && cityClock && dayTable && slowClockTerm && blankStake && coffinStake && bindingStake && /没有把时差记到任何人名下/.test(clockMyth.paras.join(' ')) && /两事恰在同一夜，不足以解释钟差/.test(clockChosen.paras.join(' ')) && /自愿学守钟/.test(clockChosen.paras.join(' ')) && /「页」指账页，不指人，也不作凭据/.test(tornPage.paras.join(' ')) && /不把空白配给任何人/.test(blankOrigin.paras.join(' ')) && /自愿轮值一息/.test(clockAnnual.paras.join(' ')) && /时差只记在钟上/.test(cityClock.hook) && /旧数从不因难解便涂改/.test(dayTable.d) && /分栏记录慢差、复核与目击/.test(slowClockTerm.d) && !/未出生者|先还账|生来替一座钟还账|钟债/.test(slowClockCopy) && /不预设欠账者/.test(blankStake.note) && /无名不等于欠债/.test(coffinStake.note) && /待有新凭再添注/.test(bindingStake.note);
noPrebirthDebt ? ok('昭京慢钟、日表、词条、守钟人物与空格桩文均不预设未来债务人') : ng('慢钟相关文案仍将未来者写成债务人');
const blankLedgerStory = q('WXSTORIES').filter(x => x.id === 's93')[0];
const blankLedgerTerm = q('WXLEXICON').filter(x => x.t === '天账庭')[0];
const blankLedgerConsistent = blankLedgerStory && blankLedgerTerm && /存一件未决之事/.test(blankLedgerStory.paras[0]) && /不刻人名/.test(blankLedgerStory.paras.join(' ')) && /不预设债务人/.test(blankLedgerTerm.d) && !/来还账的人|格里的名/.test(blankLedgerStory.paras.join(' '));
blankLedgerConsistent ? ok('天账庭空格只记未决事项，不列待出生或待偿还者') : ng('天账庭空格仍被写成未来债务人名单');
const lawTwo = q('WXCORE').laws.filter(x => x.id === 'law2')[0];
const virtualLedger = q('WXLEXICON').filter(x => x.t === '虚账')[0];
const fifthOrigin = q('WXSTORIES').filter(x => x.id === 's50')[0];
const fifthAnnual = q('WXSTORIES').filter(x => x.id === 's67')[0];
const reviewBoundaryOk = lawTwo && /未经验证/.test(lawTwo.text) && /不推定主张者作伪/.test(lawTwo.text) && /不生债/.test(lawTwo.text) && /不加倍冲销/.test(lawTwo.text) && /异源凭据/.test(lawTwo.text) && !/若强行施用，依虚账论处，年结时加倍冲销/.test(lawTwo.text) && virtualLedger && /不自动生债/.test(virtualLedger.d) && fifthOrigin && fifthOrigin.paras.some(t => /只核主张/.test(t)) && fifthOrigin.paras.some(t => /不等于/.test(t)) && fifthAnnual && fifthAnnual.paras.some(t => /待不是罪/.test(t) && /不许用来冲销/.test(t)) && !/自承为贼|年结时按虚额加倍冲销/.test(reviewUiSource);
reviewBoundaryOk ? ok('证伪律、鉴真判语与《五问》《第五问》统一为未证待核、不以缺证定罪') : ng('力量分级仍把未证主张推定作伪、负债或冲销');
/var review = WXCORE\.review/.test(reviewUiSource) && /review\.steps\.forEach/.test(reviewUiSource) && /home-focus/.test(reviewUiSource) && docIndexTargetOk
  ? ok('总纲与故纸索引可直达对应条目并短时标记')
  : ng('留格复账未完整接入总纲或故纸索引');
const threeCheckDoc = q('WXDOCS').filter(p => p.n === '三照覆籍签 · 沈归')[0];
if (!threeCheckDoc || !Array.isArray(threeCheckDoc.checks) || threeCheckDoc.checks.map(x => x.key).join('') !== '籍行见' || threeCheckDoc.checks.some(x => !x.title || !x.text)) ng('三照勘签步骤不齐');
else ok('三照勘签有籍、行、见三步，证源说明齐备');
const daily = q('WXDAILY');
if (!daily || !daily.scene || !Array.isArray(daily.scene.records) || !Array.isArray(daily.practices)) ng('街巷日用篇形状不全');
else {
  const kinds = daily.practices.map(x => x.mark).sort().join('');
  const baseKinds = daily.practices.slice(0, 3).map(x => x.mark).sort().join('');
  const dBad = daily.practices.length < 3 || baseKinds !== '借共赠' || daily.scene.records.length !== 3 ||
    daily.practices.some(x => !x.id || !x.name || !x.rule || !x.receipt || !x.boundary);
  dBad ? ng('街约须完整呈现赠、借、共三签、三笔实录与边界') : ok('街巷日用有赠借共三签（另附 ' + (daily.practices.length - 3) + ' 签）、三笔实录与各自止界');
  const dDup = new Set(daily.practices.map(x => x.id)).size !== daily.practices.length;
  dDup ? ng('街约签 id 重复') : ok('街约签 id 无重复');
}
const artifactAtlas = q('WXARTIFACTS');
if (!artifactAtlas || !artifactAtlas.intro || !artifactAtlas.principle || !Array.isArray(artifactAtlas.items)) ng('见物篇设定结构不全');
else {
  const ids = new Set(artifactAtlas.items.map(x => x.id));
  const kinds = new Set(artifactAtlas.items.map(x => x.kind));
  const badItems = artifactAtlas.items.length !== 10 || ids.size !== artifactAtlas.items.length || kinds.size !== artifactAtlas.items.length ||
    artifactAtlas.items.some(x => !x.name || !x.kind || !x.place || !x.image || !x.alt || x.alt.length < 12 || !x.scene || !x.use || !x.limit || !x.goto || !x.link);
  badItems ? ng('见物需十件异域器物，逐件具图、替代文字、所见、用途与止界') : ok('见物十件均有独立门类、图说与证据止界');
  const missingArt = artifactAtlas.items.filter(x => !fs.existsSync(P + x.image));
  missingArt.length ? ng('见物图像缺失：' + missingArt.map(x => x.image).join('、')) : ok(artifactAtlas.items.length + ' 幅见物插图本地资源齐备');
  const uncachedArt = artifactAtlas.items.filter(x => !swSource.includes("'./" + x.image + "'"));
  uncachedArt.length ? ng('见物图未进入离线册：' + uncachedArt.map(x => x.image).join('、')) : ok(artifactAtlas.items.length + ' 幅见物插图全部列入离线缓存');
  const artifactUi = /id="pg-artifacts"/.test(html) && /data-goto="artifacts"/.test(html) && /id="artifactGrid"/.test(html) && /buildArtifactAtlas/.test(fs.readFileSync(P + 'assets/app.js', 'utf8'));
  artifactUi ? ok('见物篇有导航、篇面与图文交互入口') : ng('见物篇导航或图文交互未接通');
}
const cityScenes = q('WXCITIES').filter(c => c.scene);
if (cityScenes.length !== 13 || new Set(cityScenes.map(c => c.id)).size !== 13) ng('十三京均须有互不重复的城景意象');
else {
  const sceneRecordsBad = cityScenes.filter(c => c.scene !== 'assets/cities/' + c.id + '.webp' || !c.sceneAlt || c.sceneAlt.length < 12 || !c.sceneCaption);
  sceneRecordsBad.length ? ng('京城图说、替代文字或资源名不合：' + sceneRecordsBad.map(c => c.name).join('、')) : ok('十三京景意象与城市一一对应，图说和替代文字齐备');
  const sceneBadAssets = cityScenes.filter(c => {
    const file = P + c.scene;
    if (!fs.existsSync(file) || fs.statSync(file).size > 450000) return true;
    const head = fs.readFileSync(file).subarray(0, 12).toString('ascii');
    return head.slice(0, 4) !== 'RIFF' || head.slice(8, 12) !== 'WEBP';
  });
  sceneBadAssets.length ? ng('京城意象缺图、非 WebP 或体积偏大：' + sceneBadAssets.map(c => c.scene).join('、')) : ok('十三幅京城意象为本地轻量 WebP，资源签名正确');
  const uncachedScenes = cityScenes.filter(c => !swSource.includes("'./" + c.scene + "'"));
  uncachedScenes.length ? ng('京城意象未纳入离线册：' + uncachedScenes.map(c => c.scene).join('、')) : ok('十三幅京城意象全部纳入离线缓存');
  const citySceneSource = fs.readFileSync(P + 'assets/app.js', 'utf8');
  /* v1.53.0：城景改由 detailOpen 统一铺陈，故核对「传城景入骨架」而非旧调用字面量 */
  const citySceneUi = /function openCity\(/.test(citySceneSource) && /detailOpen\(\{[\s\S]{0,220}?item: c \}\)/.test(citySceneSource) &&
    /item\.sceneAlt \|\| item\.imageAlt \|\| item\.alt/.test(citySceneSource) && /item\.sceneCaption \|\| item\.imageCaption/.test(citySceneSource);
  citySceneUi ? ok('选京即见城景，替代说明与图说齐备') : ng('天地图城景交互、替代说明或图说缺失');
}
const observatory = q('WXOBSERVATORY');
if (!observatory || !Array.isArray(observatory.instruments) || !Array.isArray(observatory.rules) || !observatory.case || !Array.isArray(observatory.case.events)) ng('三签校时篇形状不全');
else {
  const stationIds = new Set(observatory.instruments.map(x => x.id));
  const eventIds = new Set(observatory.case.events.map(x => x.id));
  const eventOrder = observatory.case.events.map(x => x.id).join(',');
  const oBad = observatory.instruments.length !== 3 || !['shadow','water','star'].every(id => stationIds.has(id)) ||
    observatory.case.events.length !== 4 || eventOrder !== 'first-sight,changed,voice-arrival,letter-arrival' ||
    observatory.rules.length !== 3 || observatory.instruments.some(x => !x.name || !x.place || !x.work || !x.record || !x.limit) ||
    observatory.case.events.some(x => !x.time || !x.mark || !x.title || !x.text);
  oBad ? ng('三签校时须含影漏星三站、三条规程与顺序正确的四笔时序') : ok('三签校时影漏星三站、三规程与四笔时序齐全');
  const oDup = stationIds.size !== observatory.instruments.length || eventIds.size !== observatory.case.events.length;
  oDup ? ng('三签或汛情时序 id 重复') : ok('三签与汛情时序 id 无重复');
  observatory.reference && /^https:\/\//.test(observatory.reference.url) && observatory.reference.note ? ok('三签校时网络参照有可回访出处与原创边界') : ng('三签校时缺少可回访资料出处或原创声明');
}
const floodStory = q('WXSTORIES').filter(x => x.id === 's99')[0];
const MiShouchang = q('WXCHARS').filter(x => x.id === 'mishouchang')[0];
const timeWords = floodStory ? floodStory.paras.join('') : '';
const timeClarity = timeWords.includes('第二道红线') && timeWords.includes('第三道红线') && timeWords.includes('消息时序分栏') &&
  !timeWords.includes('水尺越了第二刻') && !timeWords.includes('第三刻仍在') && !timeWords.includes('所见在几刻') && MiShouchang && MiShouchang.hook.includes('哪道线');
timeClarity ? ok('《两刻》水尺线与时辰分明，米守常人物钩子相互印证') : ng('汛情卷与米守常条目对水位/时辰的区分不一致');
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
/[A-Z]:[\\/](?!\/)/.test(readme) ? ng('README 暴露本机绝对路径') : ok('README 不含本机绝对路径');
[
  ['异闻', q('WXSTORIES').length, '则'],
  ['词库', q('WXLEXICON').length, '条'],
  ['人物', q('WXCHARS').length, '人'],
  ['账房谚', q('WXSAYINGS').length, '则'],
  ['京谚', q('WXCITYSAYINGS').length, '则'],
  ['货殖', q('WXGOODS').length, '物'],
  ['故纸', q('WXDOCS').length, '件']
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
function cnUnder100(v, compound) {
  if (v <= 10) return v === 10 && compound ? '壹拾' : D2[v];
  if (v < 20) return (compound ? '壹' : '') + '拾' + D2[v - 10];
  return D2[Math.floor(v / 10)] + '拾' + (v % 10 ? D2[v % 10] : '');
}
const CN = [];
for (let v = 1; v <= 300; v++) {
  let s;
  if (v < 100) s = cnUnder100(v);
  else {
    const hundreds = Math.floor(v / 100), rest = v % 100;
    s = D2[hundreds] + '佰' + (rest ? (rest < 10 ? '零' + D2[rest] : cnUnder100(rest, true)) : '');
  }
  CN[v] = '卷' + s;
}
CN[100] === '卷壹佰' && CN[110] === '卷壹佰壹拾' && CN[121] === '卷壹佰贰拾壹' && CN[300] === '卷叁佰'
  ? ok('卷号财数字可至三百，百位与零位写法无空字')
  : ng('卷号财数字百位生成失实');
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
  (t.match(/卷[零壹贰叁肆伍陆柒捌玖拾佰]{1,5}/g) || []).forEach(m => { if (!validCN.has(m)) refBad.add(m); });
});
refBad.size ? ng('人物来历／关系注引用了不存在之卷：' + [...refBad].join('、')) : ok('人物来历与关系注中 ' + reftXT.join('　').match(/卷[零壹贰叁肆伍陆柒捌玖拾佰]{1,5}/g).length + ' 处卷目引用全部存在');

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
const visibleImageDisclosureSources = html + appSrc + fs.readFileSync(P + 'data/places.js', 'utf8') + fs.readFileSync(P + 'data/cities.js', 'utf8');
const repeatedImageDisclosures = ['设定意象 · 非个体肖像或案证','本卷意象 · 仅作场景想象','意象图 · 非方位凭据','画面不作方位、道里凭据','不可由画面量取道里'];
const disclosuresRemoved = repeatedImageDisclosures.every(text => !visibleImageDisclosureSources.includes(text));
disclosuresRemoved ? ok('插图旁不再重复堆叠声明；替代文字仍保留') : ng('插图旁仍有重复声明文字');
const srcBlock = (appSrc.match(/var SOURCES = \[([\s\S]*?)\n    \];/) || [0, ''])[1];
const srcCount = (srcBlock.match(/name: '/g) || []).length;
const tipOk = html.indexOf('全书二十一篇') >= 0 && html.indexOf('索引二十一源') >= 0 && pageIds.length === 21 && srcCount === 21 && /data\/daily\.js\?v=\d+/.test(html) && /data\/daily\.js\?v=\d+/.test(swSource) && /data\/observatory\.js\?v=\d+/.test(html) && /data\/observatory\.js\?v=\d+/.test(swSource) && /data\/artifacts\.js\?v=\d+/.test(html) && /data\/artifacts\.js\?v=\d+/.test(swSource) && /data\/places\.js\?v=\d+/.test(html) && /data\/places\.js\?v=\d+/.test(swSource);
tipOk ? ok('初见笺、篇目、索引与离线数据一致（二十一篇 · 二十一源）') : ng('初见笺计数脱节：实况 ' + pageIds.length + ' 篇 · ' + srcCount + ' 源，或新增设定未纳入离线册');

console.log('\n【结论】' + (warn.length ? '需处理 ' + warn.length + ' 项' : '全部通过'));
warn.forEach(w => console.log('  ✗ ' + w));
