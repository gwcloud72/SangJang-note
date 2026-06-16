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
 const referenceDate = referenceDateFromMetadata(payload?.metadata?.referenceDate);
 const items = Array.isArray(payload.items) ? payload.items : [];
 items.forEach((item, index) => {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); return; }
  const name = item.company || item.companyName || item.corpName || item.name;
  const companyName = String(name || '').trim();
  if (name !== undefined && !companyName) warnings.push(`${label}.items[${index}]: 기업명이 확인 필요합니다.`);
  const url = item.dartUrl || item.url || item.link;
  if (!safeUrl(url)) errors.push(`${label}.items[${index}]: 공시 URL은 http/https만 허용됩니다.`);
  const statusText = String(item.status || item.stage || item.reportName || item.title || '');
  const subscriptionStart = normalizeDate(item.subscriptionStart || item.subscriptionDate || item.scheduleStart, referenceDate);
  const refundDate = normalizeIsoDate(item.refundDate);
  const listingDate = normalizeIsoDate(item.listingDate);
  if (item.refundDate && !refundDate) errors.push(`${label}.items[${index}]: refundDate는 YYYY-MM-DD 형식이어야 합니다.`);
  if (item.listingDate && !listingDate) errors.push(`${label}.items[${index}]: listingDate는 YYYY-MM-DD 형식이어야 합니다.`);
  if (item.refundDate && item.refundDateSource !== 'dart-document' && item.detailSource !== 'document') errors.push(`${label}.items[${index}]: refundDate는 DART 원문 추출값일 때만 허용됩니다. (${companyName || '기업명 확인'})`);
  if (item.listingDate && item.listingDateSource !== 'dart-document' && item.detailSource !== 'document') errors.push(`${label}.items[${index}]: listingDate는 DART 원문 추출값일 때만 허용됩니다. (${companyName || '기업명 확인'})`);
  if (/청약/.test(statusText) && subscriptionStart && !refundDate) warnings.push(`${label}.items[${index}]: 청약 일정은 환불일 확인이 필요합니다. 화면에는 환불일 확인으로 표시됩니다.`);
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


function validateCompetitionCandidates(candidates, label) {
 if (candidates !== undefined && !Array.isArray(candidates)) { errors.push(`${label}.candidates: 배열이어야 합니다.`); return; }
 const items = Array.isArray(candidates) ? candidates : [];
 for (const [index, item] of items.entries()) {
  if (!isObject(item)) { errors.push(`${label}.candidates[${index}]: 객체여야 합니다.`); continue; }
  if (!['total', 'proportional', 'equalShares', 'unknown'].includes(String(item.type || ''))) errors.push(`${label}.candidates[${index}].type: 허용된 경쟁률 후보 타입이 아닙니다.`);
  if (typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value <= 0) errors.push(`${label}.candidates[${index}].value: 양수 숫자여야 합니다.`);
  if (!['low', 'medium', 'verified'].includes(String(item.confidence || ''))) errors.push(`${label}.candidates[${index}].confidence: low/medium/verified 중 하나여야 합니다.`);
 }
}

function validateCompetitionMentions(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
 const items = Array.isArray(payload.items) ? payload.items : [];
 for (const [index, item] of items.entries()) {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); continue; }
  if (!String(item.companyName || '').trim()) errors.push(`${label}.items[${index}].companyName이 필요합니다.`);
  if (!String(item.title || '').trim()) errors.push(`${label}.items[${index}].title이 필요합니다.`);
  if (String(item.displayLabel || '') !== '뉴스 언급') errors.push(`${label}.items[${index}].displayLabel은 뉴스 언급이어야 합니다.`);
  const url = String(item.link || item.originallink || '');
  if (url && !safeUrl(url)) errors.push(`${label}.items[${index}]: 뉴스 URL은 http/https만 허용됩니다.`);
  validateCompetitionCandidates(item.candidates, `${label}.items[${index}]`);
 }
}

function validateCompetitionSnapshots(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
 const items = Array.isArray(payload.items) ? payload.items : [];
 for (const [index, item] of items.entries()) {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); continue; }
  if (!String(item.companyName || '').trim()) errors.push(`${label}.items[${index}].companyName이 필요합니다.`);
  if (!String(item.underwriter || '').trim()) warnings.push(`${label}.items[${index}].underwriter 확인 필요`);
  if (!['manual', 'broker', 'partner'].includes(String(item.sourceType || ''))) errors.push(`${label}.items[${index}].sourceType: manual/broker/partner 중 하나여야 합니다.`);
  if (!['확인 입력', '증권사 기준', '제휴 기준'].includes(String(item.sourceLabel || ''))) errors.push(`${label}.items[${index}].sourceLabel: 확인 입력/증권사 기준/제휴 기준 중 하나여야 합니다.`);
  if (typeof item.totalCompetition !== 'number' || !Number.isFinite(item.totalCompetition) || item.totalCompetition <= 0) errors.push(`${label}.items[${index}].totalCompetition: 양수 숫자여야 합니다.`);
  if (item.proportionalCompetition !== null && item.proportionalCompetition !== undefined && (typeof item.proportionalCompetition !== 'number' || !Number.isFinite(item.proportionalCompetition) || item.proportionalCompetition <= 0)) errors.push(`${label}.items[${index}].proportionalCompetition: 양수 숫자 또는 null이어야 합니다.`);
  if (!String(item.capturedAt || '').trim() && !String(item.capturedKstTime || '').trim()) errors.push(`${label}.items[${index}]: capturedAt 또는 capturedKstTime이 필요합니다.`);
  const sourceUrl = String(item.sourceUrl || '');
  if (sourceUrl && !safeUrl(sourceUrl)) errors.push(`${label}.items[${index}]: sourceUrl은 http/https만 허용됩니다.`);
 }
}

function validateIpoBriefings(payload, label) {
 if (!isObject(payload)) { errors.push(`${label}: 루트는 객체여야 합니다.`); return; }
 if (payload.items !== undefined && !Array.isArray(payload.items)) { errors.push(`${label}.items: 배열이어야 합니다.`); return; }
 const items = Array.isArray(payload.items) ? payload.items : [];
 for (const [index, item] of items.entries()) {
  if (!isObject(item)) { errors.push(`${label}.items[${index}]: 객체여야 합니다.`); continue; }
  for (const key of ['companyName', 'sector', 'ipoStage', 'underwriter', 'basisTimeLabel', 'oneLine', 'body']) {
   if (!String(item[key] || '').trim()) errors.push(`${label}.items[${index}].${key}가 필요합니다.`);
  }
  if (!Array.isArray(item.points) || item.points.length < 2 || item.points.length > 3) errors.push(`${label}.items[${index}].points: 2~3개여야 합니다.`);
  if (!Array.isArray(item.sourceLabels) || item.sourceLabels.length < 1 || item.sourceLabels.length > 4) errors.push(`${label}.items[${index}].sourceLabels: 1~4개여야 합니다.`);
  const text = `${item.oneLine || ''} ${item.body || ''} ${(item.points || []).join(' ')}`;
  if (/매수|매도|추천|권유|수익률|수익|저평가|고평가|상승\s*가능|흥행\s*확실|투자\s*매력/.test(text)) errors.push(`${label}.items[${index}]: 투자 판단처럼 보이는 문구가 있습니다.`);
  if (/실시간|공식\s*경쟁률|최종\s*경쟁률/.test(text)) errors.push(`${label}.items[${index}]: V1 금지 문구가 있습니다.`);
  if (item.competition !== null && item.competition !== undefined) {
   if (!isObject(item.competition)) errors.push(`${label}.items[${index}].competition: 객체 또는 null이어야 합니다.`);
   else if (typeof item.competition.value !== 'number' || !Number.isFinite(item.competition.value) || item.competition.value <= 0) errors.push(`${label}.items[${index}].competition.value: 양수 숫자여야 합니다.`);
  }
 }
}

function validateReportAgainstIpos(report, ipos) {
 const items = Array.isArray(ipos?.items) ? ipos.items : [];
 if (items.length) return;
 if (!isObject(report)) return;
 if (report.metadata?.generatedAt) errors.push('public/data/ipo-ai-report.json: IPO 데이터가 없는데 요약 데이터 generatedAt이 들어 있습니다. 확인 상태로 저장해야 합니다.');
 if (Array.isArray(report.lines) && report.lines.length > 0) errors.push('public/data/ipo-ai-report.json: IPO 데이터가 없는데 lines가 들어 있습니다. 확인 상태에서는 빈 배열이어야 합니다.');
}



function pad2(value) { return String(value).padStart(2, '0'); }
function isoFromParts(year, month, day) {
 const date = new Date(Date.UTC(year, month - 1, day));
 if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
 return `${year}-${pad2(month)}-${pad2(day)}`;
}
function normalizeIsoDate(value) {
 const text = String(value || '').trim();
 if (!text) return '';
 const digits = text.replace(/[^0-9]/g, '');
 if (/^\d{8}$/.test(text)) return isoFromParts(Number(text.slice(0, 4)), Number(text.slice(4, 6)), Number(text.slice(6, 8)));
 const full = /^(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(text);
 if (full) return isoFromParts(Number(full[1]), Number(full[2]), Number(full[3]));
 if (/^\d{8}$/.test(digits) && !/^\d{1,2}[.\-/]\d{1,2}/.test(text)) return isoFromParts(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6, 8)));
 return '';
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
function kstDateOnly(date = new Date()) {
 return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function referenceDateFromMetadata(_value) {
 return kstDateOnly();
}
function normalizeIpoForCompetition(item, referenceDate) {
 const companyName = String(item?.companyName || item?.company || item?.corpName || item?.name || '').trim();
 const start = normalizeDate(item?.subscriptionStart || item?.scheduleStart || item?.subscriptionDate || item?.date || item?.reportDate || item?.receiptDate || item?.rceptDt, referenceDate);
 const end = normalizeDate(item?.subscriptionEnd || item?.scheduleEnd || item?.subscriptionDate || item?.date || item?.reportDate || item?.receiptDate || item?.rceptDt || start, referenceDate);
 const listingDate = normalizeIsoDate(item?.listingDate);
 const refundDate = normalizeIsoDate(item?.refundDate);
 return { companyName, start, end, refundDate, listingDate, status: String(item?.status || item?.stage || '').trim() };
}

const NON_IPO_EVENT_RE = /유상증자|무상증자|주주배정|실권주|구주주|신주인수권|제3자배정|주주우선|전환사채|교환사채|신주인수권부사채|일반공모증자|유상청약/;
function isIpoCategory(item) {
 const category = String(item?.offeringCategory || item?.eventType || '').toLowerCase();
 return /ipo|initial_public_offering|public-offering|public/.test(category);
}
function validateIpoOnlySchedule(ipos, label) {
 const today = referenceDateFromMetadata(ipos?.metadata?.referenceDate);
 const items = Array.isArray(ipos?.items) ? ipos.items : [];
 for (const [index, item] of items.entries()) {
  const companyName = String(item?.companyName || item?.company || item?.corpName || item?.name || '').trim();
  const text = [companyName, item?.reportName, item?.title, item?.offeringMethod, item?.securityType, item?.sector].map((value) => String(value || '')).join(' ');
  if (NON_IPO_EVENT_RE.test(text)) errors.push(`${label}.items[${index}]: IPO가 아닌 유상증자/주주배정/실권주 청약 문구가 포함되어 있습니다. (${companyName || '기업명 확인'})`);
  if (!isIpoCategory(item)) errors.push(`${label}.items[${index}]: offeringCategory/eventType이 IPO로 명시되어야 합니다. (${companyName || '기업명 확인'})`);
  const normalized = normalizeIpoForCompetition(item, today);
  const displayEnd = normalized.listingDate || normalized.refundDate || normalized.end || normalizeDate(item?.scheduleEnd || item?.date || item?.reportDate || item?.receiptDate || item?.rceptDt, today);
  if (displayEnd && displayEnd < today) errors.push(`${label}.items[${index}]: 지난 일정은 표시 데이터에서 제외해야 합니다. (${companyName || '기업명 확인'}, ${displayEnd})`);
  if (normalized.status === '청약 진행중' && !(normalized.start && normalized.end && normalized.start <= today && today <= normalized.end)) errors.push(`${label}.items[${index}]: 청약 진행중은 기준일이 청약 기간 안에 있을 때만 허용됩니다. (${companyName || '기업명 확인'})`);
  if (normalized.status === '환불일' && !(normalized.end && normalized.refundDate && normalized.end < today && today <= normalized.refundDate)) errors.push(`${label}.items[${index}]: 환불일 상태는 청약 종료 후 환불일까지의 일정에만 허용됩니다. (${companyName || '기업명 확인'})`);
  if (normalized.status === '청약 예정' && normalized.start && normalized.start <= today) errors.push(`${label}.items[${index}]: 청약 예정은 기준일 이후 일정에만 허용됩니다. (${companyName || '기업명 확인'})`);
  if (normalized.status.includes('상장') && !normalized.listingDate) errors.push(`${label}.items[${index}]: 상장 상태는 listingDate가 있을 때만 허용됩니다. (${companyName || '기업명 확인'})`);
  if (normalized.status && !['예비심사','수요예측','청약 예정','청약 진행중','환불일','상장'].includes(normalized.status)) errors.push(`${label}.items[${index}]: 허용되지 않은 IPO 상태입니다. (${companyName || '기업명 확인'} / ${normalized.status})`);
 }
}

function validateCompetitionOnlyDuringActiveSubscription(ipos, snapshots, mentions) {
 const today = referenceDateFromMetadata(ipos?.metadata?.referenceDate);
 const activeCompanies = new Set((Array.isArray(ipos?.items) ? ipos.items : [])
  .map((item) => normalizeIpoForCompetition(item, today))
  .filter((item) => item.companyName && item.status === '청약 진행중' && item.start && item.end && item.start <= today && today <= item.end)
  .map((item) => item.companyName));
 const rows = [
  ...((Array.isArray(snapshots?.items) ? snapshots.items : []).map((item) => ({ kind: '확인 입력', companyName: String(item.companyName || '').trim() }))),
  ...((Array.isArray(mentions?.items) ? mentions.items : []).map((item) => ({ kind: '뉴스 언급', companyName: String(item.companyName || '').trim() }))),
 ];
 for (const row of rows) {
  if (row.companyName && !activeCompanies.has(row.companyName)) errors.push(`${row.kind} 경쟁률: ${row.companyName}은 오늘 청약 진행 기업이 아니므로 표시 데이터에 넣을 수 없습니다.`);
 }
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
const competitionMentions = readJsonIfExists(path.join(root, 'public/data/competition-mentions.json'), { optional: true });
if (competitionMentions) validateCompetitionMentions(competitionMentions, 'public/data/competition-mentions.json');
const competitionSnapshots = readJsonIfExists(path.join(root, 'public/data/competition-snapshots.json'), { optional: true });
if (competitionSnapshots) validateCompetitionSnapshots(competitionSnapshots, 'public/data/competition-snapshots.json');
if (ipos && (competitionSnapshots || competitionMentions)) validateIpoOnlySchedule(ipos, 'public/data/ipos.json');
validateCompetitionOnlyDuringActiveSubscription(ipos, competitionSnapshots, competitionMentions);
const ipoBriefings = readJsonIfExists(path.join(root, 'public/data/ipo-briefings.json'), { optional: true });
if (ipoBriefings) validateIpoBriefings(ipoBriefings, 'public/data/ipo-briefings.json');
const fredMacro = readJsonIfExists(path.join(root, 'public/data/fred-macro.json'), { optional: true });
if (fredMacro) validateFredMacro(fredMacro, 'public/data/fred-macro.json');
const fredMacroReport = readJsonIfExists(path.join(root, 'public/data/fred-macro-report.json'), { optional: true });
if (fredMacroReport) validateFredMacroReport(fredMacroReport, 'public/data/fred-macro-report.json');
if (ipos) validateFreshIpoPublicData(ipos, report);

if (warnings.length) { console.log('data:check warnings'); warnings.forEach((message) => console.log(`- ${message}`)); }
if (errors.length) { console.error('data:check failed'); errors.forEach((message) => console.error(`- ${message}`)); process.exit(1); }
console.log('data:check passed');
