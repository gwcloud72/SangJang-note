import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DATA_PATH = new URL('../public/data/ipos.json', import.meta.url);
const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));

const MAX_DATA_AGE_DAYS = Number(process.env.DART_MAX_DATA_AGE_DAYS || 7);
function parseDate(value) {
 if (!value) return null;
 const text = String(value);
 const normalized = /^\d{8}$/.test(text) ? `${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6,8)}` : text;
 const date = new Date(normalized);
 return Number.isNaN(date.getTime()) ? null : date;
}
function latestIpoDate(payload) {
 const candidates = [payload?.metadata?.updatedAt];
 for (const item of Array.isArray(payload?.items) ? payload.items : []) {
  candidates.push(item.updatedAt || item.rceptDt || item.receiptDate || item.reportDate);
 }
 return candidates.map(parseDate).filter(Boolean).sort((a, b) => b - a)[0] || null;
}


if (!payload || !Array.isArray(payload.items)) {
 throw new Error('public/data/ipos.json must contain an items array.');
}

const dataSource = String(payload?.metadata?.source || '').trim().toLowerCase();

function pad2(value) { return String(value).padStart(2, '0'); }
function isoFromParts(year, month, day) {
 const date = new Date(Date.UTC(year, month - 1, day));
 if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
 return `${year}-${pad2(month)}-${pad2(day)}`;
}
function normalizeIsoDate(value) {
 const text = String(value || '').trim();
 if (!text) return '';
 if (/^\d{8}$/.test(text)) return isoFromParts(Number(text.slice(0, 4)), Number(text.slice(4, 6)), Number(text.slice(6, 8)));
 const full = /^(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(text);
 if (full) return isoFromParts(Number(full[1]), Number(full[2]), Number(full[3]));
 return '';
}
function kstDateOnly(date = new Date()) {
 return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function referenceDateFromMetadata(_value) {
 return kstDateOnly();
}
function normalizeDate(value, referenceDate) {
 const iso = normalizeIsoDate(value);
 if (iso) return iso;
 const text = String(value || '').trim();
 const short = /^(\d{1,2})[.\-/](\d{1,2})/.exec(text);
 if (!short) return '';
 const ref = normalizeIsoDate(referenceDate) || kstDateOnly();
 const year = Number(ref.slice(0, 4));
 const month = Number(short[1]);
 const day = Number(short[2]);
 let candidate = isoFromParts(year, month, day);
 if (!candidate) return '';
 const diffDays = Math.round((Date.parse(`${candidate}T00:00:00Z`) - Date.parse(`${ref}T00:00:00Z`)) / 86400000);
 if (diffDays < -210) candidate = isoFromParts(year + 1, month, day) || candidate;
 if (diffDays > 210) candidate = isoFromParts(year - 1, month, day) || candidate;
 return candidate;
}
const referenceDate = referenceDateFromMetadata(payload?.metadata?.referenceDate);
if (payload.items.length > 0) {
 const latest = latestIpoDate(payload);
 if (!latest) throw new Error('public/data/ipos.json 기준일 확인이 필요합니다.');
 const ageDays = Math.floor((Date.now() - latest.getTime()) / 86400000);
 if (ageDays > MAX_DATA_AGE_DAYS) throw new Error(`OpenDART 최신 갱신일 ${latest.toISOString().slice(0,10)}이 ${ageDays}일 전입니다. 오래된 데이터를 배포하지 않습니다.`);
}

if (payload.items.length > 0 && dataSource && !['opendart', 'packaged', 'packaged-dart-calendar-baseline', 'dart-calendar-public-baseline', 'github-actions-sample:opendart-calendar', 'github-actions-demo:opendart-calendar', 'github-actions-demo:ipo-calendar'].includes(dataSource)) {
 console.warn('public/data/ipos.json metadata.source는 opendart, packaged, dart-calendar-public-baseline 또는 github-actions-demo:ipo-calendar 계열을 사용합니다.');
}

for (const [index, item] of payload.items.entries()) {
 if (!item || typeof item !== 'object') {
  throw new Error(`items[${index}] must be an object.`);
 }
 if (!item.companyName) {
  throw new Error(`items[${index}] companyName is required.`);
 }
 if (!/ipo|initial_public_offering|public/.test(String(item.offeringCategory || item.eventType || '').toLowerCase())) {
  throw new Error(`items[${index}] ${item.companyName}: IPO 일정만 표시할 수 있습니다.`);
 }
 if (/유상증자|주주배정|실권주|구주주|신주인수권|유상청약/.test([item.reportName, item.title, item.offeringMethod, item.securityType].map((value) => String(value || '')).join(' '))) {
  throw new Error(`items[${index}] ${item.companyName}: 유상증자/주주배정 청약은 IPO 화면에서 제외해야 합니다.`);
 }
 const scheduleStart = normalizeDate(item.subscriptionStart || item.scheduleStart || item.subscriptionDate || item.date || item.reportDate || item.receiptDate || item.rceptDt, referenceDate);
 const scheduleEnd = normalizeDate(item.listingDate || item.refundDate || item.subscriptionEnd || item.scheduleEnd || item.subscriptionDate || item.scheduleStart || item.date || item.reportDate || item.receiptDate || item.rceptDt, referenceDate);
 const status = String(item.status || item.stage || '').trim();
 if (scheduleEnd && scheduleEnd < referenceDate) {
  throw new Error(`items[${index}] ${item.companyName}: 지난 일정(${scheduleEnd})은 ${referenceDate} 기준 표시 데이터에서 제외해야 합니다.`);
 }
 if (status === '청약 예정' && scheduleStart && scheduleStart <= referenceDate) {
  throw new Error(`items[${index}] ${item.companyName}: 청약 예정은 기준일 이후 일정만 허용됩니다. (${scheduleStart})`);
 }
 if (!item.scheduleStart && !item.subscriptionDate) {
  console.warn(`items[${index}] ${item.companyName}: scheduleStart 또는 subscriptionDate 확인 필요`);
 }
}

console.log(`Data validation passed: ${payload.items.length} item(s).`);

const REPORT_PATH = new URL('../public/data/ipo-ai-report.json', import.meta.url);
const FORBIDDEN_WORD_PATTERN = /(추천|권유|수익률|수익|전망|매수|매도|유망|투자\s*포\s*인\s*트)/;

if (existsSync(REPORT_PATH)) {
 const report = JSON.parse(await readFile(REPORT_PATH, 'utf8'));
 if (!report || !Array.isArray(report.lines)) {
  throw new Error('public/data/ipo-ai-report.json must contain a lines array when present.');
 }
 if (payload.items.length === 0) {
  if (report.metadata?.generatedAt) throw new Error('IPO 데이터가 없으면 ipo-ai-report.metadata.generatedAt은 null이어야 합니다.');
  if (report.lines.length > 0) throw new Error('IPO 데이터가 없으면 ipo-ai-report.lines는 빈 배열이어야 합니다.');
 }
 for (const [index, line] of report.lines.entries()) {
  if (typeof line !== 'string' || !line.trim()) {
   throw new Error(`ipo-ai-report.lines[${index}] must be a non-fallback string.`);
  }
  const normalizedLine = line.replace(/\s+/g, '');
  if (FORBIDDEN_WORD_PATTERN.test(line) && !normalizedLine.includes('투자권유가아닙니다')) {
   throw new Error(`ipo-ai-report.lines[${index}] contains investment-like wording.`);
  }
 }
 console.log(`Report validation passed: ${report.lines.length} line(s).`);
}


const NEWS_PATH = new URL('../public/data/news.json', import.meta.url);
if (existsSync(NEWS_PATH)) {
 const news = JSON.parse(await readFile(NEWS_PATH, 'utf8'));
 if (!news || !Array.isArray(news.items)) throw new Error('public/data/news.json must contain an items array when present.');
 for (const [index, item] of news.items.entries()) {
  if (!item || typeof item !== 'object') throw new Error(`news.items[${index}] must be an object.`);
  if (!String(item.title || '').trim()) throw new Error(`news.items[${index}].title is required.`);
  const link = String(item.link || item.originallink || item.originalLink || '');
  if (link && !/^https?:\/\//.test(link)) throw new Error(`news.items[${index}] link must be http/https when provided.`);
  if (link.includes(['example', 'com'].join('.'))) throw new Error(`news.items[${index}] must not use placeholder news links.`);
 }
 console.log(`News validation passed: ${news.items.length} item(s).`);
}


function validateFredPayload(payload, label) {
 if (!payload || !Array.isArray(payload.items)) throw new Error(`${label} must contain an items array when present.`);
 const allowed = new Set(['FEDFUNDS', 'DGS10', 'CPIAUCSL', 'UNRATE']);
 for (const [index, item] of payload.items.entries()) {
  if (!item || typeof item !== 'object') throw new Error(`${label}.items[${index}] must be an object.`);
  if (!allowed.has(String(item.seriesId || ''))) throw new Error(`${label}.items[${index}].seriesId is not allowed.`);
  for (const key of ['latestValue', 'previousValue', 'change', 'changeRate']) {
   if (item[key] !== null && item[key] !== undefined && typeof item[key] !== 'number') throw new Error(`${label}.items[${index}].${key} must be number or null.`);
  }
  if (!Array.isArray(item.observations)) throw new Error(`${label}.items[${index}].observations must be an array.`);
 }
 console.log(`FRED macro validation passed: ${payload.items.length} item(s).`);
}

function validateFredReportPayload(payload, label) {
 if (!payload || !Array.isArray(payload.items)) throw new Error(`${label} must contain an items array when present.`);
 for (const [index, item] of payload.items.entries()) {
  if (!item || typeof item !== 'object') throw new Error(`${label}.items[${index}] must be an object.`);
  for (const key of ['seriesId', 'koreanName', 'plainSummary', 'ipoContext', 'caution']) {
   if (!String(item[key] || '').trim()) throw new Error(`${label}.items[${index}].${key} is required.`);
  }
  const text = `${item.plainSummary || ''} ${item.ipoContext || ''} ${item.caution || ''}`;
  if (FORBIDDEN_WORD_PATTERN.test(text) && !text.replace(/\s+/g, '').includes('투자권유가아닙니다')) {
   throw new Error(`${label}.items[${index}] contains investment-like wording.`);
  }
 }
 console.log(`FRED macro report validation passed: ${payload.items.length} item(s).`);
}

const FRED_MACRO_PATH = new URL('../public/data/fred-macro.json', import.meta.url);
if (existsSync(FRED_MACRO_PATH)) {
 const fred = JSON.parse(await readFile(FRED_MACRO_PATH, 'utf8'));
 validateFredPayload(fred, 'public/data/fred-macro.json');
}

const FRED_REPORT_PATH = new URL('../public/data/fred-macro-report.json', import.meta.url);
if (existsSync(FRED_REPORT_PATH)) {
 const fredReport = JSON.parse(await readFile(FRED_REPORT_PATH, 'utf8'));
 validateFredReportPayload(fredReport, 'public/data/fred-macro-report.json');
}


const BRIEFINGS_PATH = new URL('../public/data/ipo-briefings.json', import.meta.url);
if (existsSync(BRIEFINGS_PATH)) {
 const briefings = JSON.parse(await readFile(BRIEFINGS_PATH, 'utf8'));
 if (!briefings || !Array.isArray(briefings.items)) throw new Error('public/data/ipo-briefings.json must contain an items array when present.');
 for (const [index, item] of briefings.items.entries()) {
  if (!item || typeof item !== 'object') throw new Error(`ipo-briefings.items[${index}] must be an object.`);
  for (const key of ['companyName', 'sector', 'ipoStage', 'underwriter', 'basisTimeLabel', 'oneLine', 'body']) {
   if (!String(item[key] || '').trim()) throw new Error(`ipo-briefings.items[${index}].${key} is required.`);
  }
  if (!Array.isArray(item.points) || item.points.length < 2 || item.points.length > 3) throw new Error(`ipo-briefings.items[${index}].points must contain 2~3 values.`);
  if (!Array.isArray(item.sourceLabels) || item.sourceLabels.length < 1 || item.sourceLabels.length > 4) throw new Error(`ipo-briefings.items[${index}].sourceLabels must contain 1~4 values.`);
  const text = `${item.oneLine || ''} ${item.body || ''} ${(item.points || []).join(' ')}`;
  if (FORBIDDEN_WORD_PATTERN.test(text) && !text.replace(/\s+/g, '').includes('투자권유가아닙니다')) throw new Error(`ipo-briefings.items[${index}] contains investment-like wording.`);
 }
 console.log(`IPO briefings validation passed: ${briefings.items.length} item(s).`);
}
