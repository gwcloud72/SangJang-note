import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';

const DART_BASE_URL = 'https://opendart.fss.or.kr/api';
const OUTPUT_PATH = path.resolve(process.env.DART_IPOS_OUTPUT_PATH || 'public/data/ipos.json');

const apiKey = String(process.env.DART_API_KEY || '').trim();
function parseInteger(value, fallback, { min = -Infinity, max = Infinity } = {}) {
 if (value === undefined || value === null || String(value).trim() === '') return fallback;
 const parsed = Number(value);
 if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
  throw new Error(`정수 환경변수 범위 오류: value=${value}, range=${min}~${max}`);
 }
 return parsed;
}
const lookbackDays = parseInteger(process.env.LOOKBACK_DAYS, 180, { min: 1, max: 3650 });
const lookaheadDays = parseInteger(process.env.LOOKAHEAD_DAYS, 120, { min: 1, max: 3650 });
const chunkDays = parseInteger(process.env.DART_LIST_CHUNK_DAYS, 80, { min: 1, max: 100 });
const detailPauseMs = parseInteger(process.env.DART_DOCUMENT_PAUSE_MS, 160, { min: 0, max: 5000 });

function addDays(date, days) {
 const next = new Date(date);
 next.setUTCDate(next.getUTCDate() + days);
 return next;
}

function stripToUtcDate(date) {
 return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function todayInKorea() {
 const now = new Date();
 const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
 return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

function formatYmd(date) {
 const year = date.getUTCFullYear();
 const month = String(date.getUTCMonth() + 1).padStart(2, '0');
 const day = String(date.getUTCDate()).padStart(2, '0');
 return `${year}${month}${day}`;
}

function isoFromDate(date) {
 return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function isoFromYmd(value) {
 const text = String(value || '').replace(/[^0-9]/g, '');
 if (text.length !== 8) return '';
 return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function collapseSpaces(value) {
 return String(value || '').replace(/\s+/g, ' ').trim();
}

function clean(value) {
 if (value === undefined || value === null) return '';
 const text = collapseSpaces(value);
 if (!text || text === '-' || text === '해당사항없음') return '';
 return text;
}

function unique(values) {
 return [...new Set(values.map(clean).filter(Boolean))];
}

function sleep(ms) {
 return new Promise((resolve) => setTimeout(resolve, ms));
}

function isIsoDate(value) {
 return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function maxIsoDate(values) {
 return values.filter(isIsoDate).sort().at(-1) || '';
}

function minIsoDate(values) {
 return values.filter(isIsoDate).sort()[0] || '';
}

function dateIsBefore(a, b) {
 return isIsoDate(a) && isIsoDate(b) && a < b;
}

function buildUrl(endpoint, params) {
 const url = new URL(`${DART_BASE_URL}/${endpoint}`);
 Object.entries(params).forEach(([key, value]) => {
  if (value !== undefined && value !== null && value !== '') {
   url.searchParams.set(key, String(value));
  }
 });
 return url;
}

async function fetchJson(endpoint, params) {
 const url = buildUrl(endpoint, params);
 const response = await fetch(url);
 if (!response.ok) {
  throw new Error(`OpenDART 요청 실패: ${endpoint}, HTTP ${response.status}`);
 }
 return response.json();
}

async function fetchBinary(endpoint, params) {
 const url = buildUrl(endpoint, params);
 const response = await fetch(url);
 if (!response.ok) {
  throw new Error(`OpenDART 바이너리 요청 실패: ${endpoint}, HTTP ${response.status}`);
 }
 const arrayBuffer = await response.arrayBuffer();
 return Buffer.from(arrayBuffer);
}

function assertDartOk(json, label) {
 const status = String(json?.status || '');
 const message = json?.message || '';

 if (status === '000') return true;
 if (status === '013') return false;

 throw new Error(`${label} OpenDART 오류: status=${status}, message=${message}`);
}

function chunkDateRanges(startDate, endDate, daysPerChunk) {
 const ranges = [];
 let cursor = stripToUtcDate(startDate);
 const last = stripToUtcDate(endDate);

 while (cursor <= last) {
  const rangeEnd = addDays(cursor, daysPerChunk);
  const end = rangeEnd > last ? last : rangeEnd;
  ranges.push({ start: cursor, end });
  cursor = addDays(end, 1);
 }

 return ranges;
}

async function fetchFilings() {
 const today = todayInKorea();
 const start = addDays(today, -lookbackDays);
 const ranges = chunkDateRanges(start, today, chunkDays);
 const filings = [];

 for (const range of ranges) {
  let pageNo = 1;
  let totalPage = 1;

  do {
   const json = await fetchJson('list.json', {
    crtfc_key: apiKey,
    bgn_de: formatYmd(range.start),
    end_de: formatYmd(range.end),
    last_reprt_at: 'Y',
    pblntf_ty: 'C',
    pblntf_detail_ty: 'C001',
    sort: 'date',
    sort_mth: 'desc',
    page_no: pageNo,
    page_count: 100,
   });

   const hasData = assertDartOk(json, `공시 목록 ${formatYmd(range.start)}-${formatYmd(range.end)}`);
   if (!hasData) break;

   filings.push(...(Array.isArray(json.list) ? json.list : []));
   totalPage = Number.parseInt(json.total_page || '1', 10) || 1;
   pageNo += 1;
   await sleep(120);
  } while (pageNo <= totalPage);
 }

 return filings;
}

async function fetchEquitySummary(corpCode, bgnDe, endDe) {
 const json = await fetchJson('estkRs.json', {
  crtfc_key: apiKey,
  corp_code: corpCode,
  bgn_de: bgnDe,
  end_de: endDe,
 });

 const hasData = assertDartOk(json, `지분증권 주요정보 ${corpCode}`);
 if (!hasData) return [];

 return flattenEstkResponse(json);
}

async function fetchDocumentText(receiptNo) {
 const buffer = await fetchBinary('document.xml', {
  crtfc_key: apiKey,
  rcept_no: receiptNo,
 });

 if (!buffer.length) return '';

 if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);

  const textEntries = entries.filter((entry) => /\.(xml|xbrl|htm|html|txt)$/i.test(entry.entryName));
  const selectedEntries = textEntries.length ? textEntries : entries.slice(0, 1);

  return collapseSpaces(
   selectedEntries
    .map((entry) => decodeMarkupBuffer(entry.getData()))
    .filter(Boolean)
    .join(' ')
  );
 }

 const text = decodeMarkupBuffer(buffer);
 const result = parseDartResultText(text);
 if (result) {
  if (result.status === '000' || result.status === '013') return '';
  throw new Error(`status=${result.status}, message=${result.message || '알 수 없는 오류'}`);
 }

 return text;
}

function flattenEstkResponse(json) {
 const rows = [];

 if (Array.isArray(json?.list)) {
  rows.push(...json.list);
 }

 const groups = Array.isArray(json?.group) ? json.group : [];
 for (const group of groups) {
  const groupRows = Array.isArray(group?.list) ? group.list : [];
  for (const row of groupRows) {
   rows.push({ ...row, _groupTitle: group.title || '' });
  }
 }

 return rows;
}

function mergeRowsByReceipt(rows) {
 const byReceipt = new Map();

 for (const row of rows) {
  const receiptNo = clean(row.rcept_no);
  const fallbackKey = `${clean(row.corp_code)}-${clean(row.sbd)}-${clean(row.stksen)}-${clean(row._groupTitle)}`;
  const key = receiptNo || fallbackKey;

  if (!byReceipt.has(key)) {
   byReceipt.set(key, { underwriters: new Set() });
  }

  const target = byReceipt.get(key);
  for (const [field, value] of Object.entries(row)) {
   const cleaned = clean(value);
   if (!cleaned) continue;
   if (!target[field]) target[field] = cleaned;
  }

  const underwriter = clean(row.actnmn);
  if (underwriter) target.underwriters.add(underwriter);
 }

 return [...byReceipt.values()].map((row) => ({
  ...row,
  underwriters: [...row.underwriters],
 }));
}

function extractDates(rawValue) {
 const raw = clean(rawValue);
 if (!raw) return [];

 const matches = [];
 const patterns = [
  /(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g,
  /(20\d{2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/g,
  /\b(20\d{2})(\d{2})(\d{2})\b/g,
 ];

 for (const pattern of patterns) {
  let match;
  while ((match = pattern.exec(raw)) !== null) {
   const year = match[1];
   const month = match.length === 4 ? match[2] : match[1].slice(4, 6);
   const day = match.length === 4 ? match[3] : match[1].slice(6, 8);
   const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

   if (!Number.isNaN(date.getTime())) {
    matches.push(isoFromDate(date));
   }
  }
 }

 return unique(matches).sort();
}

function firstDate(rawValue) {
 return extractDates(rawValue)[0] || clean(rawValue);
}

function computeStatus(scheduleStart, scheduleEnd, todayIso, { refundDate = '', listingDate = '', rawStatus = '' } = {}) {
 const raw = String(rawStatus || '');
 if (/예비/.test(raw)) return '예비심사';
 if (!scheduleStart && !scheduleEnd) {
  if (listingDate && todayIso >= listingDate) return '상장';
  if (listingDate && todayIso < listingDate) return '상장';
  return /수요/.test(raw) ? '예비심사' : '일정 확인';
 }

 const start = scheduleStart || scheduleEnd;
 const end = scheduleEnd || scheduleStart;

 if (todayIso < start) return '청약 예정';
 if (todayIso >= start && todayIso <= end) return '청약 진행중';
 if (refundDate && todayIso <= refundDate) return '환불일';
 if (listingDate && todayIso < listingDate) return '상장';
 if (listingDate && todayIso >= listingDate) return '상장';
 if (/수요/.test(raw)) return '예비심사';
 return '종료';
}

function normalizeSchedule(row, filingByReceipt, filingsByCorp, todayIso) {
 const receiptNo = clean(row.rcept_no);
 const corpCode = clean(row.corp_code);
 const filing = filingByReceipt.get(receiptNo) || (filingsByCorp.get(corpCode) || [])[0] || {};
 const subscriptionDates = extractDates(row.sbd);
 const scheduleStart = subscriptionDates[0] || '';
 const scheduleEnd = subscriptionDates[subscriptionDates.length - 1] || scheduleStart;
 const paymentDate = firstDate(row.pymd);
 const allotmentNoticeDate = firstDate(row.asand);
 const subscriptionNoticeDate = firstDate(row.sband);
 const allotmentBaseDate = firstDate(row.asstd);

 return {
  companyName: clean(row.corp_name || filing.corp_name),
  corpCode,
  corpClass: clean(row.corp_cls || filing.corp_cls),
  stockCode: clean(filing.stock_code),
  receiptNo,
  receiptDate: isoFromYmd(filing.rcept_dt),
  reportName: clean(filing.report_nm),
  securityType: clean(row.stksen),
  offeringMethod: clean(row.slmthn),
  offerPrice: clean(row.slprc),
  offerAmount: clean(row.slta),
  stockCount: clean(row.stkcnt),
  parValue: clean(row.fv),
  subscriptionDate: clean(row.sbd),
  subscriptionNoticeDate,
  paymentDate,
  allotmentNoticeDate,
  allotmentBaseDate,
  scheduleStart,
  scheduleEnd,
  subscriptionStart: scheduleStart,
  subscriptionEnd: scheduleEnd,
  underwriters: unique(row.underwriters || []),
  dartUrl: receiptNo ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNo}` : '',
  mainMatterReceiptNo: clean(row.rpt_rcpn),
  mainMatterUrl: clean(row.rpt_rcpn) ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${clean(row.rpt_rcpn)}` : '',
  status: computeStatus(scheduleStart, scheduleEnd, todayIso, { rawStatus: filing.report_nm }),
  refundDate: '',
  listingDate: '',
  demandForecastStart: '',
  demandForecastEnd: '',
  refundDateSource: '',
  listingDateSource: '',
  subscriptionCompetitionRate: '',
  demandForecastCompetitionRate: '',
  detailSource: '',
  detailSourceNote: '',
  offeringCategory: 'ipo',
  eventType: 'initial_public_offering',
  sourceMode: 'opendart',
 };
}


const NON_IPO_EVENT_RE = /유상증자|무상증자|주주배정|실권주|구주주|신주인수권|제3자배정|주주우선|전환사채|교환사채|신주인수권부사채|일반공모증자|유상청약/;
function isIpoLike(item) {
 const text = [item.companyName, item.reportName, item.offeringMethod, item.securityType, item.detailSourceNote].map((value) => String(value || '')).join(' ');
 if (NON_IPO_EVENT_RE.test(text)) return false;
 // OpenDART 지분증권 데이터에는 유상증자도 섞인다. 주주배정·실권주·구주주 신호가 있으면 IPO 화면에서 제외한다.
 if (/주주|실권|구주|증자/.test(String(item.offeringMethod || ''))) return false;
 return true;
}

function shouldKeep(item, todayIso) {
 const today = new Date(`${todayIso}T00:00:00Z`);
 const futureCutoff = isoFromDate(addDays(today, lookaheadDays));
 const start = minIsoDate([item.scheduleStart, item.scheduleEnd, item.refundDate, item.listingDate, item.receiptDate]) || item.scheduleStart || item.scheduleEnd || item.receiptDate;
 const end = maxIsoDate([item.scheduleStart, item.scheduleEnd, item.refundDate, item.listingDate, item.receiptDate]) || item.scheduleEnd || item.scheduleStart || item.receiptDate;

 if (!start && !end) return isIpoLike(item);
 return isIpoLike(item) && (!end || end >= todayIso) && (!start || start <= futureCutoff);
}

function sortItems(a, b) {
 const aDate = a.scheduleStart || a.receiptDate || '9999-12-31';
 const bDate = b.scheduleStart || b.receiptDate || '9999-12-31';
 if (aDate !== bDate) return aDate.localeCompare(bDate);
 return (a.companyName || '').localeCompare(b.companyName || '', 'ko');
}

function parseDartResultText(text) {
 const xmlStatus = text.match(/<status>\s*([^<]+)\s*<\/status>/i)?.[1];
 const xmlMessage = text.match(/<message>\s*([^<]*)\s*<\/message>/i)?.[1];
 if (xmlStatus) {
  return { status: xmlStatus, message: xmlMessage || '' };
 }

 const jsonStatus = text.match(/"status"\s*:\s*"([^"]+)"/)?.[1];
 const jsonMessage = text.match(/"message"\s*:\s*"([^"]*)"/)?.[1];
 if (jsonStatus) {
  return { status: jsonStatus, message: jsonMessage || '' };
 }

 return null;
}

function normalizeEncoding(value) {
 const encoding = String(value || '').trim().toLowerCase();
 if (!encoding) return 'utf8';
 if (encoding.includes('949') || encoding.includes('euc-kr') || encoding.includes('ks_c_5601')) return 'cp949';
 if (encoding.includes('utf')) return 'utf8';
 return encoding;
}

function decodeBuffer(buffer) {
 const head = buffer.subarray(0, 256).toString('ascii');
 const declared = head.match(/encoding=["']([^"']+)["']/i)?.[1];
 const encoding = normalizeEncoding(declared);

 try {
  return iconv.decode(buffer, encoding);
 } catch {
  return buffer.toString('utf8');
 }
}

function decodeHtmlEntities(text) {
 return String(text || '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}

function decodeMarkupBuffer(buffer) {
 const text = decodeBuffer(buffer);
 return collapseSpaces(
  decodeHtmlEntities(
   text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?(?:p|div|tr|td|th|li|br|section|article|table|h\d)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  )
 );
}

function normalizeCompetitionRate(value) {
 const match = collapseSpaces(value).match(/([0-9][0-9,]*(?:\.\d+)?)\s*(?:대|[:：])\s*1/i);
 if (!match) return clean(value);
 return `${match[1]} 대 1`;
}

function findDateNearKeyword(text, keywords, options = {}) {
 const normalized = collapseSpaces(text);
 const forwardWindow = options.forwardWindow || 120;
 const aroundWindow = options.aroundWindow || 180;

 for (const keyword of keywords) {
  let index = normalized.indexOf(keyword);

  while (index !== -1) {
   const forwardText = normalized.slice(index, index + keyword.length + forwardWindow);
   const forwardDate = extractDates(forwardText)[0];
   if (forwardDate) return forwardDate;

   const aroundText = normalized.slice(Math.max(0, index - 40), index + keyword.length + aroundWindow);
   const aroundDate = extractDates(aroundText)[0];
   if (aroundDate) return aroundDate;

   index = normalized.indexOf(keyword, index + keyword.length);
  }
 }

 return '';
}

function findDateRangeNearKeyword(text, keywords, options = {}) {
 const normalized = collapseSpaces(text);
 const forwardWindow = options.forwardWindow || 120;
 const aroundWindow = options.aroundWindow || 180;

 for (const keyword of keywords) {
  let index = normalized.indexOf(keyword);

  while (index !== -1) {
   const forwardText = normalized.slice(index, index + keyword.length + forwardWindow);
   const forwardDates = extractDates(forwardText);
   if (forwardDates.length) return [forwardDates[0], forwardDates[1] || forwardDates[0]];

   const aroundText = normalized.slice(Math.max(0, index - 40), index + keyword.length + aroundWindow);
   const aroundDates = extractDates(aroundText);
   if (aroundDates.length) return [aroundDates[0], aroundDates[1] || aroundDates[0]];

   index = normalized.indexOf(keyword, index + keyword.length);
  }
 }

 return ['', ''];
}


function findRateNearKeyword(text, keywords, options = {}) {
 const normalized = collapseSpaces(text);
 const windowSize = options.windowSize || 120;
 const pattern = /([0-9][0-9,]*(?:\.\d+)?)\s*(?:대|[:：])\s*1/i;

 for (const keyword of keywords) {
  let index = normalized.indexOf(keyword);

  while (index !== -1) {
   const window = normalized.slice(Math.max(0, index - 40), index + keyword.length + windowSize);
   const match = window.match(pattern);
   if (match) return `${match[1]} 대 1`;
   index = normalized.indexOf(keyword, index + keyword.length);
  }
 }

 return '';
}

function extractDocumentDetails(text) {
 const refundDate = findDateNearKeyword(text, [
  '환불일',
  '환불 예정일',
  '환불예정일',
  '환불 예정',
  '환불 및 주금납입일',
 ]);

 const listingDate = findDateNearKeyword(text, [
  '상장예정일',
  '상장일',
  '매매개시 예정일',
  '매매개시예정일',
  '상장일',
 ]);

 const [demandForecastStart, demandForecastEnd] = findDateRangeNearKeyword(text, [
  '수요예측 기간',
  '수요예측기간',
  '기관투자자 수요예측',
  '기관 수요예측',
  '수요예측일',
  '수요예측',
 ]);

 const demandForecastCompetitionRate = normalizeCompetitionRate(
  findRateNearKeyword(text, [
   '예비심사 경쟁률',
   '예비심사경쟁률',
   '기관 경쟁률',
   '기관경쟁률',
  ])
 );

 const subscriptionCompetitionRate = normalizeCompetitionRate(
  findRateNearKeyword(text, [
   '일반청약 경쟁률',
   '일반청약경쟁률',
   '청약 경쟁률',
   '청약경쟁률',
  ]) || (
   demandForecastCompetitionRate
    ? ''
    : findRateNearKeyword(text, ['경쟁률'])
  )
 );

 const detailFields = [refundDate, listingDate, demandForecastStart, subscriptionCompetitionRate, demandForecastCompetitionRate].filter(Boolean);

 return {
  refundDate,
  listingDate,
  demandForecastStart,
  demandForecastEnd,
  demandForecastSource: demandForecastStart ? 'dart-document' : '',
  refundDateSource: refundDate ? 'dart-document' : '',
  listingDateSource: listingDate ? 'dart-document' : '',
  subscriptionCompetitionRate,
  demandForecastCompetitionRate,
  detailSource: detailFields.length ? 'document' : '',
  detailSourceNote: detailFields.length
   ? '환불일·상장예정일·수요예측 기간·경쟁률은 공시 원문에서 자동 추출된 값입니다.'
   : '',
 };
}

function sanitizeDocumentDetailsForSchedule(item, details, errors) {
 const result = { ...details };
 const scheduleEnd = item.scheduleEnd || item.scheduleStart || '';

 if (result.refundDate && dateIsBefore(result.refundDate, scheduleEnd)) {
  errors.push(`${item.companyName || item.receiptNo}: DART 원문 환불일(${result.refundDate})이 청약 종료일(${scheduleEnd})보다 앞서 무시했습니다.`);
  result.refundDate = '';
  result.refundDateSource = '';
 }

 if (result.listingDate && dateIsBefore(result.listingDate, scheduleEnd)) {
  errors.push(`${item.companyName || item.receiptNo}: DART 원문 상장일(${result.listingDate})이 청약 종료일(${scheduleEnd})보다 앞서 무시했습니다.`);
  result.listingDate = '';
  result.listingDateSource = '';
 }

 if (result.refundDate && result.listingDate && dateIsBefore(result.listingDate, result.refundDate)) {
  errors.push(`${item.companyName || item.receiptNo}: DART 원문 상장일(${result.listingDate})이 환불일(${result.refundDate})보다 앞서 무시했습니다.`);
  result.listingDate = '';
  result.listingDateSource = '';
 }

 if (result.demandForecastStart && item.scheduleStart && !dateIsBefore(result.demandForecastStart, item.scheduleStart)) {
  errors.push(`${item.companyName || item.receiptNo}: DART 원문 수요예측일(${result.demandForecastStart})이 청약 시작일(${item.scheduleStart}) 이후라 무시했습니다.`);
  result.demandForecastStart = '';
  result.demandForecastEnd = '';
  result.demandForecastSource = '';
 }

 const detailFields = [result.refundDate, result.listingDate, result.demandForecastStart, result.subscriptionCompetitionRate, result.demandForecastCompetitionRate].filter(Boolean);
 result.detailSource = detailFields.length ? 'document' : '';
 result.detailSourceNote = detailFields.length
  ? '환불일·상장예정일·수요예측 기간·경쟁률은 공시 원문에서 자동 추출된 값입니다.'
  : '';

 return result;
}

async function enrichItemsWithDocumentDetails(items, errors) {
 const enriched = [];
 let extractedCount = 0;

 for (const item of items) {
  if (!item.receiptNo) {
   enriched.push(item);
   continue;
  }

  try {
   const text = await fetchDocumentText(item.receiptNo);

   if (!text) {
    enriched.push(item);
   } else {
    const details = sanitizeDocumentDetailsForSchedule(item, extractDocumentDetails(text), errors);
    if (details.detailSource) extractedCount += 1;
    enriched.push({ ...item, ...details });
   }
  } catch (error) {
   errors.push(`${item.companyName || item.receiptNo}: 원문 추출 실패 (${error.message})`);
   enriched.push(item);
  }

  await sleep(detailPauseMs);
 }

 return {
  items: enriched,
  extractedCount,
 };
}


async function hasReusableIpoPayload() {
 try {
  const text = await readFile(OUTPUT_PATH, 'utf8');
  const payload = JSON.parse(text);
  return Boolean(payload && typeof payload === 'object' && !Array.isArray(payload) && Array.isArray(payload.items));
 } catch {
  return false;
 }
}

async function main() {
 if (!apiKey) {
  if (await hasReusableIpoPayload()) {
   console.warn('DART_API_KEY가 없어 기존 ipos.json을 유지합니다.');
   return;
  }
  throw new Error('DART_API_KEY 환경변수가 확인 필요합니다. 기존 IPO 데이터가 없어 생성을 중단합니다.');
 }

 const today = todayInKorea();
 const todayIso = isoFromDate(today);
 const bgnDe = formatYmd(addDays(today, -lookbackDays));
 const endDe = formatYmd(today);
 const errors = [];

 console.log(`OpenDART 증권신고(지분증권) 공시 조회: ${bgnDe} ~ ${endDe}`);
 const filings = await fetchFilings();

 const uniqueFilings = [...new Map(
  filings
   .filter((item) => clean(item.corp_code))
   .map((item) => [clean(item.rcept_no) || `${clean(item.corp_code)}-${clean(item.report_nm)}`, item])
 ).values()];

 const filingByReceipt = new Map(uniqueFilings.map((filing) => [clean(filing.rcept_no), filing]));
 const filingsByCorp = new Map();

 for (const filing of uniqueFilings) {
  const corpCode = clean(filing.corp_code);
  if (!filingsByCorp.has(corpCode)) filingsByCorp.set(corpCode, []);
  filingsByCorp.get(corpCode).push(filing);
 }

 const corpCodes = [...filingsByCorp.keys()];
 const allRows = [];

 console.log(`공시 ${uniqueFilings.length}건, 회사 ${corpCodes.length}개 조회`);

 for (const corpCode of corpCodes) {
  try {
   const rows = await fetchEquitySummary(corpCode, bgnDe, endDe);
   allRows.push(...rows);
   await sleep(160);
  } catch (error) {
   errors.push(`${corpCode}: ${error.message}`);
   console.warn(`일부 회사 조회 실패: ${corpCode}`);
  }
 }

 const mergedRows = mergeRowsByReceipt(allRows);
 const normalizedItems = mergedRows
  .map((row) => normalizeSchedule(row, filingByReceipt, filingsByCorp, todayIso))
  .filter((item) => item.companyName && isIpoLike(item))
  .filter((item) => {
   const futureCutoff = isoFromDate(addDays(today, lookaheadDays));
   const start = item.scheduleStart || item.scheduleEnd || item.receiptDate || todayIso;
   return start <= futureCutoff;
  })
  .sort(sortItems);

 console.log(`표시 대상 후보 ${normalizedItems.length}건 원문 공시 상세정보 추출 시작`);

 const futureCutoffForCandidates = isoFromDate(addDays(today, lookaheadDays));
 const futureCandidateCount = normalizedItems.filter((item) => {
  const start = minIsoDate([item.scheduleStart, item.scheduleEnd]) || item.scheduleStart || item.scheduleEnd || item.receiptDate || todayIso;
  const end = maxIsoDate([item.scheduleStart, item.scheduleEnd]) || item.scheduleEnd || item.scheduleStart || item.receiptDate || todayIso;
  return isIpoLike(item) && end >= todayIso && start <= futureCutoffForCandidates;
 }).length;

 const enrichedResult = await enrichItemsWithDocumentDetails(normalizedItems, errors);
 const extractedCount = enrichedResult.extractedCount;
 const items = enrichedResult.items
  .map((item) => ({ ...item, status: computeStatus(item.scheduleStart, item.scheduleEnd, todayIso, { refundDate: item.refundDate, listingDate: item.listingDate, rawStatus: item.reportName || item.status }) }))
  .filter((item) => item.status !== '종료' && shouldKeep(item, todayIso))
  .sort(sortItems);

 const statusCounts = items.reduce((acc, item) => {
  const status = item.status || '상태 확인';
  acc[status] = (acc[status] || 0) + 1;
  return acc;
 }, {});

 const output = {
  metadata: {
   updatedAt: new Date().toISOString(),
   source: 'OpenDART',
   basis: '증권신고서 주요정보 - 지분증권(estkRs), 공시검색(list), 공시원문(document.xml)',
   dateRange: { bgnDe, endDe },
   lookbackDays,
   lookaheadDays,
   totalFilings: uniqueFilings.length,
   totalCompanies: corpCodes.length,
   totalItems: items.length,
   referenceDate: todayIso,
   status: items.length ? 'ready' : 'empty',
   candidateItems: normalizedItems.length,
   futureCandidateItems: futureCandidateCount,
   statusCounts,
   documentDetailItems: extractedCount,
   warning: errors.length
    ? `${errors.length}개 항목의 상세 조회 또는 원문 추출에 실패했습니다. Actions 로그에서 확인하세요.`
    : '환불일·상장예정일·경쟁률은 공시 원문에서 추출 가능한 경우에만 표시됩니다. 유상증자·주주배정·실권주 청약은 IPO 화면에서 제외됩니다.',
  },
  items,
 };

 if (!items.length && futureCandidateCount > 0) {
  throw new Error(`DART 후보 ${normalizedItems.length}건 중 미래 IPO 후보 ${futureCandidateCount}건이 있었지만 표시 일정이 0건입니다. 필터/원문 추출 가드 점검이 필요하여 기존 데이터를 보존합니다.`);
 }

 await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
 await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

 console.log(`저장 완료: ${OUTPUT_PATH}`);
 console.log(`표시 일정: ${items.length}건`);
 console.log(`상태별 표시 일정: ${JSON.stringify(statusCounts)}`);
 if (!items.length && normalizedItems.length) {
  console.warn(`표시 대상 후보 ${normalizedItems.length}건 중 현재 기준으로 유지할 IPO 일정이 없습니다. 날짜/출처 가드로 제외된 항목은 Actions 로그의 경고를 확인하세요.`);
 }
 console.log(`원문 상세 추출 완료: ${extractedCount}건`);
}

main().catch((error) => {
 console.error(error);
 process.exit(1);
});
