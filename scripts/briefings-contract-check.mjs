import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
function rel(file) { return path.relative(root, file).replaceAll(path.sep, '/'); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function json(file) {
  try { return JSON.parse(read(file)); }
  catch (error) { errors.push(`${rel(file)}: JSON parse 실패 (${error.message})`); return null; }
}
function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
const file = path.join(root, 'public/data/ipo-briefings.json');
if (!fs.existsSync(file)) errors.push('public/data/ipo-briefings.json 누락');
const payload = fs.existsSync(file) ? json(file) : null;
if (payload) {
  if (!isObject(payload)) errors.push('ipo-briefings 루트는 객체여야 합니다.');
  if (!Array.isArray(payload.items)) errors.push('ipo-briefings.items는 배열이어야 합니다.');
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) warnings.push('ipo-briefings.items가 비어 있습니다.');
  for (const [index, item] of items.entries()) {
    if (!isObject(item)) { errors.push(`items[${index}] 객체 확인 필요`); continue; }
    for (const key of ['companyName', 'sector', 'ipoStage', 'underwriter', 'oneLine', 'body', 'basisTimeLabel']) {
      if (!String(item[key] || '').trim()) errors.push(`items[${index}].${key} 필요`);
    }
    if (!Array.isArray(item.points) || item.points.length < 2 || item.points.length > 3) errors.push(`items[${index}].points는 2~3개여야 합니다.`);
    if (!Array.isArray(item.sourceLabels) || item.sourceLabels.length < 1 || item.sourceLabels.length > 4) errors.push(`items[${index}].sourceLabels는 1~4개여야 합니다.`);
    const text = `${item.oneLine || ''} ${item.body || ''} ${(item.points || []).join(' ')}`;
    if (/추천|권유|매수|매도|수익률|수익|저평가|고평가|상승\s*가능|흥행\s*확실|투자\s*매력/i.test(text)) {
      errors.push(`items[${index}]: 투자 판단처럼 보이는 문구가 있습니다.`);
    }
    if (/실시간|공식\s*경쟁률|최종\s*경쟁률/.test(text)) errors.push(`items[${index}]: V1 금지 문구가 있습니다.`);
  }
}
const scripts = ['scripts/lib/gemini-briefings.mjs', 'scripts/generate-ipo-briefings.mjs', 'scripts/lib/gemini-flash.mjs'].map((name) => read(path.join(root, name))).join('\n');
for (const needle of ['GEMINI_BRIEFINGS_ENABLED', 'GEMINI_BRIEFINGS_MAX_CALLS', 'ipo-briefings-gemini-cache.json', 'generateGeminiJson']) {
  if (!scripts.includes(needle)) errors.push(`${needle} 계약 누락`);
}
if (!scripts.includes('투자 추천') || !scripts.includes('뉴스 언급')) errors.push('브리핑 프롬프트 안전 규칙 누락');
if (warnings.length) { console.log('briefings:check warnings'); warnings.forEach((warning) => console.log(`- ${warning}`)); }
if (errors.length) { console.error('briefings:check failed'); errors.forEach((error) => console.error(`- ${error}`)); process.exit(1); }
console.log('briefings:check passed');
