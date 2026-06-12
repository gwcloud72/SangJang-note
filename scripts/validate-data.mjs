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
if (payload.items.length > 0) {
 const latest = latestIpoDate(payload);
 if (!latest) throw new Error('public/data/ipos.json 기준일 확인이 필요합니다.');
 const ageDays = Math.floor((Date.now() - latest.getTime()) / 86400000);
 if (ageDays > MAX_DATA_AGE_DAYS) throw new Error(`OpenDART 최신 갱신일 ${latest.toISOString().slice(0,10)}이 ${ageDays}일 전입니다. 오래된 데이터를 배포하지 않습니다.`);
}

if (payload.items.length > 0 && dataSource && !['opendart', 'packaged', 'packaged-dart-calendar-baseline', 'dart-calendar-public-baseline'].includes(dataSource)) {
 console.warn('public/data/ipos.json metadata.source는 opendart, packaged 또는 dart-calendar-public-baseline을 사용합니다.');
}

for (const [index, item] of payload.items.entries()) {
 if (!item || typeof item !== 'object') {
  throw new Error(`items[${index}] must be an object.`);
 }
 if (!item.companyName) {
  throw new Error(`items[${index}] companyName is required.`);
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
