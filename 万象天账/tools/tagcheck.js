// tagcheck.js — 找出 HTML 中未闭合的属性引号（cp936 损坏特征）
// 用法: node tagcheck.js <file>
const fs = require('fs');
const path = process.argv[2];
const t = fs.readFileSync(path, 'utf8');

let state = 'TEXT';      // TEXT | COMMENT | TAG | DQ | SQ
let line = 1;
let tagStart = -1;
let quoteStart = -1;
let quoteLine = 1;
const errs = [];

function ctx(i, back = 70, fwd = 40) {
  return t.slice(Math.max(0, i - back), Math.min(t.length, i + fwd)).replace(/\n/g, '\\n');
}

for (let i = 0; i < t.length; i++) {
  const c = t[i];
  if (c === '\n') { line++; continue; }

  if (state === 'TEXT') {
    if (c === '<' && t.startsWith('<!--', i)) { state = 'COMMENT'; tagStart = i; }
    else if (c === '<') { state = 'TAG'; tagStart = i; }
  } else if (state === 'COMMENT') {
    if (t.startsWith('-->', i)) { i += 2; state = 'TEXT'; }
    else if (c === '>' && !t.startsWith('-->', i) && false) { /* never */ }
  } else if (state === 'TAG') {
    if (c === '"') { state = 'DQ'; quoteStart = i; quoteLine = line; }
    else if (c === "'") { state = 'SQ'; quoteStart = i; quoteLine = line; }
    else if (c === '>') { state = 'TEXT'; }
  } else if (state === 'DQ' || state === 'SQ') {
    const q = state === 'DQ' ? '"' : "'";
    if (c === q) {
      // 属性值内出现「属性名 =」→ 引号错位（cp936 吃引号的另一种后果）
      const val = t.slice(quoteStart + 1, i);
      if (/\s[a-z][a-z0-9-]*=$/.test(val) || /(^|\s)[a-z][a-z0-9-]*=\s/.test(val)) {
        errs.push({ at: quoteStart, line: quoteLine, why: 'attribute value looks like it swallowed the next attribute: ' + JSON.stringify(val.slice(-30)), text: ctx(quoteStart) });
      }
      state = 'TAG';
    }
    else if (c === '>' || c === '<' || c === '\n') {
      errs.push({ at: quoteStart, line: quoteLine, why: 'attribute value unclosed before ' + JSON.stringify(c), text: ctx(quoteStart) });
      // resync: treat this quote opener as closed here
      state = 'TAG';
      if (c === '<') { if (t.startsWith('<!--', i)) state = 'COMMENT'; }
    }
  }
}

if (state !== 'TEXT' && state !== 'COMMENT') {
  errs.push({ at: quoteStart, line: quoteLine, why: 'file ended inside ' + state, text: ctx(quoteStart) });
}

console.log('FILE: ' + path);
console.log('ERRORS: ' + errs.length);
for (const e of errs) {
  console.log('  L' + e.line + ' @' + e.at + '  ' + e.why);
  console.log('     ' + e.text);
}
