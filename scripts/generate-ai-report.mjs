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

function buildScheduleRows(items) {
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
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
}

function buildCounts(rows) {
  return {
    open: rows.filter((row) => row.type === '청약').length,
    refund: rows.filter((row) => row.type === '환불').length,
    listing: rows.filter((row) => row.type === '상장').length,
  };
}


function isPlaceholderPayload(payload) {
  const source = collapseSpaces(payload?.metadata?.source).toLowerCase();
  const notice = collapseSpaces(payload?.metadata?.notice).toLowerCase();
  return source === 'demo' || source === 'sample' || notice.includes('샘플') || notice.includes('demo');
}

function buildPendingReport() {
  return {
    metadata: {
      generatedAt: null,
      source: 'pending',
      model: null,
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
  const rows = buildScheduleRows(items);
  const counts = buildCounts(rows);
  const lines = [];

  if (!rows.length) {
    lines.push('IPO 일정 데이터 갱신 후 요약이 표시됩니다.');
  } else {
    lines.push(`청약 ${counts.open}건, 환불 ${counts.refund}건, 상장 ${counts.listing}건이 집계되었습니다.`);
    const first = rows[0];
    if (first) lines.push(`${formatDate(first.date)} ${first.companyName} ${first.type} 일정이 가장 먼저 표시됩니다.`);
    const listing = rows.find((row) => row.type === '상장');
    if (listing) lines.push(`${formatDate(listing.date)} ${listing.companyName} 상장 일정이 포함되어 있습니다.`);
  }

  while (lines.length < 3) lines.push('상세 일정은 표와 일정 흐름에서 확인할 수 있습니다.');

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'local-rules',
      model: null,
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
  const rows = buildScheduleRows(items).slice(0, 8);
  const counts = buildCounts(buildScheduleRows(items));

  const prompt = [
    '아래 IPO 일정 데이터를 바탕으로 한국어 요약 3줄만 작성해줘.',
    '주의: 투자 추천, 청약 권유, 수익률 전망, 매수/매도 표현은 절대 쓰지 마.',
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
    },
    lines: sanitizeLines(parsed?.lines, fallbackReport.lines),
  };
}

async function main() {
  const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  if (isPlaceholderPayload(payload)) {
    await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(buildPendingReport(), null, 2)}\n`, 'utf8');
    console.log(`데모/샘플 IPO 데이터라서 대기 상태 요약 파일을 생성했습니다: ${OUTPUT_PATH}`);
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
