import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

const MAX_DATA_AGE_DAYS = Number(process.env.DART_MAX_DATA_AGE_DAYS || 7);

function parseDate(value) {
 if (!value) return null;
 const text = String(value);
 const normalized = /^\d{8}$/.test(text) ? `${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6,8)}` : text;
 const date = new Date(normalized);
 return Number.isNaN(date.getTime()) ? null : date;
}

function latestIpoDate(ipos) {
 const candidates = [ipos?.metadata?.updatedAt];
 for (const item of Array.isArray(ipos?.items) ? ipos.items : []) {
  candidates.push(item.updatedAt || item.rceptDt || item.receiptDate || item.reportDate);
 }
 return candidates.map(parseDate).filter(Boolean).sort((a, b) => b - a)[0] || null;
}

function validateFreshIpoPublicData(ipos, report) {
 const items = Array.isArray(ipos?.items) ? ipos.items : [];
 if (!items.length) return;
 const latest = latestIpoDate(ipos);
 if (!latest) {
  errors.push('public/data/ipos.json: 갱신 기준일 확인이 필요합니다.');
  return;
 }
 const days = Math.floor((Date.now() - latest.getTime()) / 86400000);
 if (days > MAX_DATA_AGE_DAYS) {
  errors.push(`public/data/ipos.json: 최신 갱신일 ${latest.toISOString().slice(0,10)}이 ${days}일 전입니다. ${MAX_DATA_AGE_DAYS}일 초과 IPO 데이터는 배포 금지입니다.`);
 }
}


function readJsonIfExists(filePath, { optional = false } = {}) {
 if (!fs.existsSync(filePath)) {
  if (!optional) errors.push(`${path.relative(root, filePath)}: 파일 확인이 필요합니다.`);
  else warnings.push(`${path.relative(root, filePath)}: 운영 데이터 파일 확인 필요 - fallback 화면로 렌더링됩니다.`);
  return null;
 }
 try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
 catch (error) { errors.push(`${path.relative(root, filePath)}: JSON parse 실패 (${error.message})`); return null; }
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function safeUrl(value) {
 if (!value) return true;
 try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol); }
 catch { return false; }
}

function validateIpos(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
 const items = Array.isArray(payload.items) ? payload.items : [];
 items.forEach((item, index) => {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); return; }
  const name = item.company || item.companyName || item.corpName || item.name;
  if (name !== undefined && String(name).trim() === '') warnings.push(`${label}.items[${index}]: 기업명이 확인 필요합니다.`);
  const url = item.dartUrl || item.url || item.link;
  if (!safeUrl(url)) errors.push(`${label}.items[${index}]: 공시 URL은 http/https만 허용됩니다.`);
 });
}

function validateReport(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.metadata !== undefined && !isObject(payload.metadata)) warnings.push(`${label}.metadata: 객체가 아니면 메타 정보는 fallback으로 표시됩니다.`);
}


function validateNews(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
 const items = Array.isArray(payload.items) ? payload.items : [];
 items.forEach((item, index) => {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); return; }
  if (!String(item.title || '').trim()) errors.push(`${label}.items[${index}]: title이 필요합니다.`);
  const newsUrl = String(item.link || item.originallink || item.originalLink || '');
  if (newsUrl && !safeUrl(newsUrl)) errors.push(`${label}.items[${index}]: 뉴스 URL은 http/https만 허용됩니다.`);
  if (newsUrl.includes(['example', 'com'].join('.'))) errors.push(`${label}.items[${index}]: 검증되지 않은 뉴스 링크는 허용하지 않습니다.`);
 });
}

function validateReportAgainstIpos(report, ipos) {
 const items = Array.isArray(ipos?.items) ? ipos.items : [];
 if (items.length) return;
 if (!isObject(report)) return;
 if (report.metadata?.generatedAt) errors.push('public/data/ipo-ai-report.json: IPO 데이터가 없는데 요약 리포트 generatedAt이 들어 있습니다. 확인 상태로 저장해야 합니다.');
 if (Array.isArray(report.lines) && report.lines.length > 0) errors.push('public/data/ipo-ai-report.json: IPO 데이터가 없는데 lines가 들어 있습니다. 확인 상태에서는 빈 배열이어야 합니다.');
}


function validateFredMacro(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
 const ids = new Set(['FEDFUNDS', 'DGS10', 'CPIAUCSL', 'UNRATE']);
 const items = Array.isArray(payload.items) ? payload.items : [];
 if (items.length && items.length !== 4) warnings.push(`${label}.items: 권장 지표 수는 4개입니다. 현재 ${items.length}개`);
 for (const [index, item] of items.entries()) {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); continue; }
  if (!ids.has(String(item.seriesId || ''))) errors.push(`${label}.items[${index}].seriesId: 허용된 FRED 지표가 아닙니다.`);
  for (const key of ['latestValue', 'previousValue', 'change', 'changeRate']) {
   if (item[key] !== null && item[key] !== undefined && typeof item[key] !== 'number') errors.push(`${label}.items[${index}].${key}: 숫자 또는 null이어야 합니다.`);
  }
  if (item.latestDate !== null && item.latestDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(item.latestDate))) errors.push(`${label}.items[${index}].latestDate: YYYY-MM-DD 형식이어야 합니다.`);
  if (item.previousDate !== null && item.previousDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(item.previousDate))) errors.push(`${label}.items[${index}].previousDate: YYYY-MM-DD 형식이어야 합니다.`);
  if (!Array.isArray(item.observations)) errors.push(`${label}.items[${index}].observations: 배열이어야 합니다.`);
 }
}

function validateFredMacroReport(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
 const items = Array.isArray(payload.items) ? payload.items : [];
 for (const [index, item] of items.entries()) {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); continue; }
  if (!String(item.seriesId || '').trim()) errors.push(`${label}.items[${index}].seriesId가 필요합니다.`);
  for (const key of ['koreanName', 'plainSummary', 'ipoContext', 'caution']) {
   if (!String(item[key] || '').trim()) errors.push(`${label}.items[${index}].${key}가 필요합니다.`);
  }
  const text = `${item.plainSummary || ''} ${item.ipoContext || ''} ${item.caution || ''}`;
  if (/매수|매도|추천|유망|수익률|수익/.test(text) && !text.replace(/\s+/g, '').includes('투자권유가아닙니다')) {
   errors.push(`${label}.items[${index}]: 투자 추천처럼 보이는 문구가 있습니다.`);
  }
 }
}

const ipos = readJsonIfExists(path.join(root, 'public/data/ipos.json'), { optional: true });
if (ipos) validateIpos(ipos, 'public/data/ipos.json');
const report = readJsonIfExists(path.join(root, 'public/data/ipo-ai-report.json'), { optional: true });
if (report) validateReport(report, 'public/data/ipo-ai-report.json');
if (report) validateReportAgainstIpos(report, ipos);
const news = readJsonIfExists(path.join(root, 'public/data/news.json'), { optional: true });
if (news) validateNews(news, 'public/data/news.json');
const fredMacro = readJsonIfExists(path.join(root, 'public/data/fred-macro.json'), { optional: true });
if (fredMacro) validateFredMacro(fredMacro, 'public/data/fred-macro.json');
const fredMacroReport = readJsonIfExists(path.join(root, 'public/data/fred-macro-report.json'), { optional: true });
if (fredMacroReport) validateFredMacroReport(fredMacroReport, 'public/data/fred-macro-report.json');
if (ipos) validateFreshIpoPublicData(ipos, report);

if (warnings.length) { console.log('data:check warnings'); warnings.forEach((message) => console.log(`- ${message}`)); }
if (errors.length) { console.error('data:check failed'); errors.forEach((message) => console.error(`- ${message}`)); process.exit(1); }
console.log('data:check passed');
