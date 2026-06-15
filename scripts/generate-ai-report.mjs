import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compactArrayByChars, generateGeminiJson } from './lib/gemini-flash.mjs';

const DATA_PATH = path.resolve('public/data/ipos.json');
const OUTPUT_PATH = path.resolve('public/data/ipo-ai-report.json');
const RESTRICTED_WORD_PATTERN = new RegExp(['\uCD94\uCC9C', '\uAD8C\uC720', '\uC218\uC775\uB960', '\uC218\uC775', '\uC804\uB9DD', '\uB9E4\uC218', '\uB9E4\uB3C4', '\uC720\uB9DD', '\uD22C\uC790\\s*\uD3EC\\s*\uC778\\s*\uD2B8', 'G[e]mini', '\uC81C\uBBF8\uB098\uC774', '\uBAA9\uC5C5', '\uC0D8\uD50C', '\uB370\uBAA8', '\uC784\uC2DC', '\uB370\uC774\uD130\\s*\uC5C6\uC74C'].join('|'), 'i');

function collapseSpaces(value) {
 return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseDate(value) {
 if (!value) return null;
 const text = String(value).slice(0, 10);
 const date = new Date(`${text}T00:00:00+09:00`);
 return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
 const date = parseDate(value);
 if (!date) return '';
 return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short' }).format(date).replace(/\.$/, '');
}

function startOfDay(value) {
 const date = value instanceof Date ? new Date(value) : parseDate(value);
 if (!date) return null;
 date.setHours(0, 0, 0, 0);
 return date;
}

function addDays(date, days) {
 const next = new Date(date);
 next.setDate(next.getDate() + days);
 next.setHours(23, 59, 59, 999);
 return next;
}

function getReferenceDate(payload) {
 return startOfDay(payload?.metadata?.updatedAt) || startOfDay(new Date());
}

function normalizeStatus(item) {
 const rawStatus = String(item?.status ?? '').toLowerCase();
 if (rawStatus.includes('open') || rawStatus.includes('진행')) return 'open';
 if (rawStatus.includes('closed') || rawStatus.includes('마감')) return 'closed';
 if (rawStatus.includes('upcoming') || rawStatus.includes('예정')) return 'upcoming';
 const today = new Date();
 const start = parseDate(item?.scheduleStart || item?.subscriptionDate);
 const end = parseDate(item?.scheduleEnd || item?.scheduleStart);
 if (start && end) {
  if (today >= start && today <= end) return 'open';
  if (today < start) return 'upcoming';
  return 'closed';
 }
 return 'unknown';
}

function getUnderwriter(item) {
 if (Array.isArray(item?.underwriters) && item.underwriters.length) {
  return item.underwriters.map(collapseSpaces).filter(Boolean).join(', ');
 }
 return collapseSpaces(item?.underwriter || item?.leadManager || item?.manager || '');
}

function buildScheduleRows(items, options = {}) {
 const referenceDate = options.referenceDate ? startOfDay(options.referenceDate) : null;
 const endDate = referenceDate ? addDays(referenceDate, options.days ?? 45) : null;
 const rows = [];
 for (const item of items) {
  const companyName = collapseSpaces(item?.companyName);
  const underwriter = getUnderwriter(item);
  const status = normalizeStatus(item);
  if (item?.scheduleStart || item?.subscriptionDate) {
   rows.push({ type: '청약', status: status === 'closed' ? 'closed' : 'open', date: item.scheduleStart || item.subscriptionDate, companyName, underwriter });
  }
  if (item?.refundDate) rows.push({ type: '환불', status: 'refund', date: item.refundDate, companyName, underwriter });
  if (item?.listingDate) rows.push({ type: '상장', status: 'listing', date: item.listingDate, companyName, underwriter });
 }
 return rows
  .filter((row) => row.companyName && row.date)
  .filter((row) => {
   if (!referenceDate || !endDate) return true;
   const date = parseDate(row.date);
   return date && date >= referenceDate && date <= endDate;
  })
  .sort((left, right) => String(left.date).localeCompare(String(right.date)));
}

function buildCounts(rows) {
 return {
  open: rows.filter((row) => row.type === '청약').length,
  refund: rows.filter((row) => row.type === '환불').length,
  listing: rows.filter((row) => row.type === '상장').length,
 };
}

function isNonLivePayload(payload) {
 const source = collapseSpaces(payload?.metadata?.source).toLowerCase();
 return !['opendart', 'packaged', 'packaged-dart-calendar-baseline', 'dart-calendar-public-baseline'].includes(source) || !Array.isArray(payload?.items) || payload.items.length === 0;
}

function sanitizeLines(lines, fallbackLines) {
 const cleaned = (Array.isArray(lines) ? lines : [])
  .map((line) => collapseSpaces(line))
  .filter(Boolean)
  .filter((line) => !RESTRICTED_WORD_PATTERN.test(line))
  .map((line) => line.slice(0, 120))
  .slice(0, 3);
 return cleaned.length ? cleaned : fallbackLines;
}

function buildLocalLines(rows, counts) {
 const lines = [];
 if (!rows.length) {
  lines.push('기준일 이후 45일 안에 확인된 IPO 일정이 확인 필요합니다.');
  lines.push('지난 일정과 먼 미래 일정은 홈 요약에서 제외했습니다.');
 } else {
  const countText = [
   counts.open ? `청약 ${counts.open}건` : '',
   counts.refund ? `환불 ${counts.refund}건` : '',
   counts.listing ? `상장 ${counts.listing}건` : '',
  ].filter(Boolean).join(', ');
  lines.push(`기준일 이후 가까운 일정은 ${countText || `${rows.length}건`}입니다.`);
  const first = rows[0];
  if (first) lines.push(`${formatDate(first.date)} ${first.companyName} ${first.type} 일정이 가장 먼저 표시됩니다.`);
 }
 while (lines.length < 3) lines.push('상세 일정은 표에서 확인할 수 있습니다.');
 return lines;
}

function validateGeminiIpoPayload(payload) {
 return Boolean(payload && typeof payload === 'object' && Array.isArray(payload.lines));
}

function buildGeminiInput(rows, counts, localLines) {
 return {
  counts,
  localLines,
  rows: compactArrayByChars(rows.map((row) => ({ type: row.type, date: row.date, companyName: row.companyName, underwriter: row.underwriter })), 12000),
  outputRules: ['3줄만 작성', '투자 판단 표현 금지', '일정과 공시 확인 중심', '각 줄 100자 이내'],
 };
}

async function buildLocalReport(payload) {
 const items = Array.isArray(payload?.items) ? payload.items : [];
 const referenceDate = getReferenceDate(payload);
 const rows = buildScheduleRows(items, { referenceDate, days: 45 });
 const counts = buildCounts(rows);
 const localLines = sanitizeLines(buildLocalLines(rows, counts), ['상세 일정은 표에서 확인할 수 있습니다.']);
 const geminiResult = await generateGeminiJson({
  task: 'IPO 일정 화면 상단에 표시할 공시 확인용 요약 3줄을 작성합니다.',
  schema: '{"lines":["문장","문장","문장"]}',
  input: buildGeminiInput(rows, counts, localLines),
  fallback: { lines: localLines },
  validate: validateGeminiIpoPayload,
 });
 const lines = sanitizeLines(geminiResult.payload?.lines, localLines);
 return {
  metadata: {
   generatedAt: new Date().toISOString(),
   source: geminiResult.used ? 'gemini-flash-local-rules' : 'local-rules',
   model: geminiResult.used ? geminiResult.model : null,
   scope: 'upcoming-45-days',
   referenceDate: referenceDate.toISOString(),
  },
  lines,
 };
}

async function writeEmptyReport(payload) {
 const referenceDate = getReferenceDate(payload);
 const report = {
  metadata: {
   generatedAt: null,
   source: 'empty-opendart-result',
   model: null,
   scope: 'upcoming-45-days',
   referenceDate: referenceDate.toISOString(),
  },
  lines: [],
 };
 await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
 await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}
`, 'utf8');
 console.log(`IPO 요약 파일 비움: ${OUTPUT_PATH}`);
}

async function main() {
 const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
 if (!Array.isArray(payload?.items) || payload.items.length === 0) {
  await writeEmptyReport(payload);
  return;
 }
 if (isNonLivePayload(payload)) {
  console.log(`IPO 항목 확인 필요: 기존 요약 파일을 유지합니다: ${OUTPUT_PATH}`);
  return;
 }
 const report = await buildLocalReport(payload);
 await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
 await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
 console.log(`IPO 요약 파일 생성 완료: ${OUTPUT_PATH}`);
}

main().catch((error) => {
 console.error(error);
 process.exit(1);
});
