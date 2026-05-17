import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.resolve('public/data/ipos.json');
const OUTPUT_PATH = path.resolve('public/data/ipo-ai-report.json');

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const GEMINI_REPORT_ENABLED = String(process.env.GEMINI_REPORT_ENABLED || 'true').toLowerCase() !== 'false';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;

const FORBIDDEN_WORD_PATTERN = /(추천|권유|수익률|수익|전망|매수|매도|유망|투자\s*포인트)/;

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
  return source !== 'opendart' || !Array.isArray(payload?.items) || payload.items.length === 0;
}

function buildPendingReport() {
  return {
    metadata: {
      generatedAt: null,
      source: 'pending',
      model: null,
      scope: 'upcoming-45-days',
    },
    lines: ['IPO 일정 데이터 갱신 후 요약이 표시됩니다.'],
  };
}

function sanitizeLines(lines, fallbackLines) {
  const cleaned = (Array.isArray(lines) ? lines : [])
    .map((line) => collapseSpaces(line))
    .filter(Boolean)
    .filter((line) => !FORBIDDEN_WORD_PATTERN.test(line))
    .slice(0, 3);
  return cleaned.length ? cleaned : fallbackLines;
}

function buildLocalReport(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const referenceDate = getReferenceDate(payload);
  const rows = buildScheduleRows(items, { referenceDate, days: 45 });
  const counts = buildCounts(rows);
  const lines = [];

  if (!rows.length) {
    lines.push('기준일 이후 45일 안에 표시할 IPO 일정이 없습니다.');
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

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'local-rules',
      model: null,
      scope: 'upcoming-45-days',
      referenceDate: referenceDate.toISOString(),
    },
    lines: sanitizeLines(lines, ['IPO 일정 데이터 갱신 후 요약이 표시됩니다.']),
  };
}


function stripCodeFence(value) {
  return String(value || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractText(responseJson) {
  const candidates = Array.isArray(responseJson?.candidates) ? responseJson.candidates : [];
  return candidates
    .flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [])
    .map((part) => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function callGemini(payload, fallbackReport) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const referenceDate = getReferenceDate(payload);
  const rows = buildScheduleRows(items, { referenceDate, days: 45 }).slice(0, 8);
  const counts = buildCounts(rows);

  const prompt = [
    '아래 기준일 이후 가까운 IPO 일정 데이터만 바탕으로 한국어 요약 3줄만 작성해줘.',
    '주의: 투자 추천, 청약 권유, 수익률 전망, 매수/매도 표현은 절대 쓰지 마. 주어진 rows 밖의 먼 미래 일정도 언급하지 마.',
    '출력은 JSON만 사용해. 형식: {"lines":["문장1","문장2","문장3"]}',
    '',
    JSON.stringify({ counts, rows }, null, 2),
  ].join('\n');

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini API 호출 실패: ${response.status} ${response.statusText} | ${text.slice(0, 240)}`);
  }

  const raw = JSON.parse(text);
  const answerText = stripCodeFence(extractText(raw));
  const parsed = JSON.parse(answerText);

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'gemini',
      model: GEMINI_MODEL,
      scope: 'upcoming-45-days',
      referenceDate: getReferenceDate(payload).toISOString(),
    },
    lines: sanitizeLines(parsed?.lines, fallbackReport.lines),
  };
}

async function main() {
  const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  if (isNonLivePayload(payload)) {
    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(buildPendingReport(), null, 2)}\n`, 'utf8');
    console.log(`운영 데이터가 아니므로 대기 상태 요약 파일을 생성했습니다: ${OUTPUT_PATH}`);
    return;
  }

  const fallbackReport = buildLocalReport(payload);
  let report = fallbackReport;

  if (GEMINI_REPORT_ENABLED && GEMINI_API_KEY) {
    try {
      report = await callGemini(payload, fallbackReport);
      console.log(`Gemini IPO 요약 생성 완료: ${GEMINI_MODEL}`);
    } catch (error) {
      console.warn(`Gemini IPO 요약 생성 실패. 로컬 규칙 요약으로 대체합니다.\n${error.message}`);
    }
  } else {
    console.log('GEMINI_API_KEY가 없거나 GEMINI_REPORT_ENABLED=false라서 로컬 규칙 요약을 생성합니다.');
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`IPO 요약 파일 생성 완료: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
