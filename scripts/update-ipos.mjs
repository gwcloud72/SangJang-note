import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';

const DART_BASE_URL = 'https://opendart.fss.or.kr/api';
const OUTPUT_PATH = path.resolve('public/data/ipos.json');

const apiKey = process.env.DART_API_KEY;
const lookbackDays = Number.parseInt(process.env.LOOKBACK_DAYS || '180', 10);
const lookaheadDays = Number.parseInt(process.env.LOOKAHEAD_DAYS || '120', 10);
const chunkDays = Number.parseInt(process.env.DART_LIST_CHUNK_DAYS || '80', 10);
const detailPauseMs = Number.parseInt(process.env.DART_DOCUMENT_PAUSE_MS || '160', 10);

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
    underwriters: unique(row.underwriters || []),
    dartUrl: receiptNo ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNo}` : '',
    mainMatterReceiptNo: clean(row.rpt_rcpn),
    mainMatterUrl: clean(row.rpt_rcpn) ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${clean(row.rpt_rcpn)}` : '',
    status: computeStatus(scheduleStart, scheduleEnd, todayIso),
    refundDate: '',
    listingDate: '',
    subscriptionCompetitionRate: '',
    demandForecastCompetitionRate: '',
    detailSource: '',
    detailSourceNote: '',
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
    '상장 예정일',
    '매매개시 예정일',
    '매매개시예정일',
    '상장일',
  ]);

  const demandForecastCompetitionRate = normalizeCompetitionRate(
    findRateNearKeyword(text, [
      '수요예측 경쟁률',
      '수요예측경쟁률',
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

  const detailFields = [refundDate, listingDate, subscriptionCompetitionRate, demandForecastCompetitionRate].filter(Boolean);

  return {
    refundDate,
    listingDate,
    subscriptionCompetitionRate,
    demandForecastCompetitionRate,
    detailSource: detailFields.length ? 'document' : '',
    detailSourceNote: detailFields.length
      ? '환불일·상장예정일·경쟁률은 공시 원문에서 자동 추출된 값입니다.'
      : '',
  };
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
        const details = extractDocumentDetails(text);
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
  const normalizedItems = mergedRows
    .map((row) => normalizeSchedule(row, filingByReceipt, filingsByCorp, todayIso))
    .filter((item) => item.companyName && shouldKeep(item, todayIso))
    .sort(sortItems);

  console.log(`표시 대상 일정 ${normalizedItems.length}건 원문 공시 상세정보 추출 시작`);

  const { items, extractedCount } = await enrichItemsWithDocumentDetails(normalizedItems, errors);

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
      documentDetailItems: extractedCount,
      warning: errors.length
        ? `${errors.length}개 항목의 상세 조회 또는 원문 추출에 실패했습니다. Actions 로그에서 확인하세요.`
        : '환불일·상장예정일·경쟁률은 공시 원문에서 추출 가능한 경우에만 표시됩니다. 지분증권 공시라 IPO 외 유상증자 등 다른 청약도 포함될 수 있습니다.',
    },
    items,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(`저장 완료: ${OUTPUT_PATH}`);
  console.log(`표시 일정: ${items.length}건`);
  console.log(`원문 상세 추출 완료: ${extractedCount}건`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
