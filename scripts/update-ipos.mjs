import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DART_BASE_URL = 'https://opendart.fss.or.kr/api';
const OUTPUT_PATH = path.resolve('public/data/ipos.json');

const apiKey = process.env.DART_API_KEY;
const lookbackDays = Number.parseInt(process.env.LOOKBACK_DAYS || '180', 10);
const lookaheadDays = Number.parseInt(process.env.LOOKAHEAD_DAYS || '120', 10);
const chunkDays = Number.parseInt(process.env.DART_LIST_CHUNK_DAYS || '80', 10);

if (!apiKey) {
  console.error('DART_API_KEY 환경변수가 없습니다. GitHub Actions Secret 또는 로컬 환경변수로 설정하세요.');
  process.exit(1);
}

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

function clean(value) {
  if (value === undefined || value === null) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text || text === '-' || text === '해당사항없음') return '';
  return text;
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function assertDartOk(json, label) {
  const status = String(json?.status || '');
  const message = json?.message || '';

  if (status === '000') return true;
  if (status === '013') return false; // 조회된 데이터 없음

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

function computeStatus(scheduleStart, scheduleEnd, todayIso) {
  if (!scheduleStart && !scheduleEnd) return 'unknown';

  const start = scheduleStart || scheduleEnd;
  const end = scheduleEnd || scheduleStart;

  if (todayIso >= start && todayIso <= end) return 'open';
  if (todayIso < start) return 'upcoming';
  if (todayIso > end) return 'closed';

  return 'unknown';
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
    subscriptionDate: clean(row.sbd),
    subscriptionNoticeDate,
    paymentDate,
    allotmentNoticeDate,
    scheduleStart,
    scheduleEnd,
    underwriters: unique(row.underwriters || []),
    dartUrl: receiptNo ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNo}` : '',
    status: computeStatus(scheduleStart, scheduleEnd, todayIso),
  };
}

function shouldKeep(item, todayIso) {
  if (!item.scheduleStart && !item.scheduleEnd) return true;

  const today = new Date(`${todayIso}T00:00:00Z`);
  const closedCutoff = isoFromDate(addDays(today, -14));
  const futureCutoff = isoFromDate(addDays(today, lookaheadDays));
  const start = item.scheduleStart || item.scheduleEnd;
  const end = item.scheduleEnd || item.scheduleStart;

  return end >= closedCutoff && start <= futureCutoff;
}

function sortItems(a, b) {
  const aDate = a.scheduleStart || a.receiptDate || '9999-12-31';
  const bDate = b.scheduleStart || b.receiptDate || '9999-12-31';
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  return (a.companyName || '').localeCompare(b.companyName || '', 'ko');
}

async function main() {
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
  const items = mergedRows
    .map((row) => normalizeSchedule(row, filingByReceipt, filingsByCorp, todayIso))
    .filter((item) => item.companyName && shouldKeep(item, todayIso))
    .sort(sortItems);

  const output = {
    metadata: {
      updatedAt: new Date().toISOString(),
      source: 'OpenDART',
      basis: '증권신고서 주요정보 - 지분증권(estkRs) 및 공시검색(list)',
      dateRange: { bgnDe, endDe },
      lookbackDays,
      lookaheadDays,
      totalFilings: uniqueFilings.length,
      totalCompanies: corpCodes.length,
      totalItems: items.length,
      warning: errors.length
        ? `${errors.length}개 회사의 상세 조회에 실패했습니다. Actions 로그에서 확인하세요.`
        : 'DART 지분증권 공시 기반 자료라 IPO 외 유상증자 등 다른 지분증권 청약이 포함될 수 있습니다.',
    },
    items,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(`저장 완료: ${OUTPUT_PATH}`);
  console.log(`표시 일정: ${items.length}건`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
