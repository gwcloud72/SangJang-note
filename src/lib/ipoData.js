import { normalizeText, formatDateTime } from './format.js';
import { isPriorityDisclosure } from './dashboardFilters.js';

function parseDateValue(value, referenceYear = 2025) {
  const text = normalizeText(value, '');
  if (!text) return null;

  const full = text.match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
  if (full) {
    const date = new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const monthDay = text.match(/(\d{1,2})[-.\/](\d{1,2})/);
  if (monthDay) {
    const date = new Date(referenceYear, Number(monthDay[1]) - 1, Number(monthDay[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function parseUpdatedDate(value) {
  const text = normalizeText(value, '');
  const matched = text.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (!matched) return null;
  const date = new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getReferenceDate(items) {
  const dates = (items || []).map((item) => parseUpdatedDate(item.updatedAt)).filter(Boolean).sort((a, b) => b.getTime() - a.getTime());
  return dates[0] || new Date();
}

export function getEventDates(item, referenceDate = getReferenceDate([item])) {
  const referenceYear = referenceDate.getFullYear();
  return [item?.subscription, item?.refund, item?.listing]
    .flatMap((value) => String(value || '').split(/~|,/))
    .map((value) => parseDateValue(value, referenceYear))
    .filter(Boolean);
}

export function matchesPeriod(item, period, referenceDate) {
  if (period === '전체') return true;
  const dates = getEventDates(item, referenceDate);
  if (!dates.length) {
    if (period === '이번 주') return /오늘|D-/.test(`${item.priority} ${item.status}`);
    return true;
  }

  if (period === '이번 달') {
    return dates.some((date) => date.getFullYear() === referenceDate.getFullYear() && date.getMonth() === referenceDate.getMonth());
  }

  if (period === '이번 주') {
    const start = addDays(startOfDay(referenceDate), -1);
    const end = addDays(startOfDay(referenceDate), 7);
    return dates.some((date) => date >= start && date <= end) || /오늘|D-/.test(`${item.priority} ${item.status}`);
  }

  return true;
}

function monthLabel(date) {
  return `${date.getMonth() + 1}월`;
}

export function buildMonthBars(items, referenceDate = getReferenceDate(items)) {
  const months = Array.from({ length: 6 }, (_, index) => new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 3 + index, 1));
  const buckets = new Map(months.map((date) => [monthLabel(date), { label: monthLabel(date), scheduled: 0, done: 0 }]));

  (items || []).forEach((item) => {
    const dates = getEventDates(item, referenceDate);
    const target = dates.find((date) => date.getMonth() === referenceDate.getMonth()) || dates[0];
    if (!target) return;
    const label = monthLabel(target);
    if (!buckets.has(label)) buckets.set(label, { label, scheduled: 0, done: 0 });
    const bucket = buckets.get(label);
    if (String(item.status).includes('완료')) bucket.done += 1;
    else bucket.scheduled += 1;
  });

  return { bars: Array.from(buckets.values()), currentLabel: monthLabel(referenceDate) };
}



export function normalizeStatusLabel(status) {
  const raw = normalizeText(status, '').toLowerCase();
  if (!raw || raw === 'unknown') return '확인 필요';
  if (raw.includes('closed') || raw.includes('마감') || raw.includes('완료')) return '마감';
  if (raw.includes('open') || raw.includes('진행')) return '청약 진행';
  if (raw.includes('upcoming') || raw.includes('예정')) return '상장 예정';
  if (raw.includes('refund') || raw.includes('환불')) return '환불';
  if (raw.includes('listing') || raw.includes('상장')) return '상장';
  return normalizeText(status, '확인 필요');
}

export function parseItems(payload) {
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  if (!rawItems.length) return [];
  return rawItems.map((item, index) => ({
    id: normalizeText(item.id || item.receiptNo || item.corpCode || item.stockCode || `ipo-${index}`),
    company: normalizeText(item.company || item.companyName || item.corpName || item.name, `기업 ${index + 1}`),
    market: normalizeText(item.market || item.stockMarket || item.marketType, '코스닥'),
    sector: normalizeText(item.sector || item.industry || item.business, '확인 필요'),
    price: normalizeText(item.price || item.offerPrice || item.offerPriceRange || item.publicOfferingPrice, '미정'),
    subscription: normalizeText(item.subscription || item.subscriptionPeriod || item.offerDate || item.subscribeDate, '확인 필요'),
    refund: normalizeText(item.refund || item.refundDate || item.refundmentDate || item.returnDate || item.paymentDate || item.payDate || item.refundDay || item.refundAt || item.refundSchedule || item.allotmentDate, '확인 필요'),
    listing: normalizeText(item.listing || item.listingDate || item.listDate, '확인 필요'),
    manager: normalizeText(item.manager || item.leadManager || item.underwriter || item.host, '확인 필요'),
    status: normalizeStatusLabel(item.status || item.phase || item.progress),
    updatedAt: formatDateTime(item.updatedAt || item.rceptDt || item.reportDate),
    filingType: normalizeText(item.filingType || item.reportName || item.disclosureName, '공시'),
    filingNote: normalizeText(item.filingNote || item.note || item.summary, '원문 확인'),
    priority: normalizeText(item.priority || item.dDay || '', ''),
    dartUrl: item.dartUrl || item.url || item.link || '',
  }));
}

export function getStats(items) {
  const active = items.filter((item) => item.status.includes('진행') || item.status.includes('청약')).length;
  const upcoming = items.filter((item) => item.status.includes('예정')).length;
  const done = items.filter((item) => item.status.includes('마감') || item.status.includes('완료')).length;
  const filings = items.filter(isPriorityDisclosure).length;
  const today = items.filter((item) => `${item.priority} ${item.status}`.includes('오늘')).length;
  const urgent = items.filter((item) => /오늘|D-[0-3]/.test(`${item.priority} ${item.status}`) || isPriorityDisclosure(item)).length;
  const listingSoon = items.filter((item) => item.status.includes('상장') && item.status.includes('예정')).length;
  const next = items.find((item) => item.status.includes('진행') || item.status.includes('청약')) || items.find((item) => item.status.includes('예정')) || items[0];
  return { total: items.length, active, upcoming, done, filings, today, urgent, listingSoon, next };
}

export function statusClass(status) {
  if (status.includes('청약')) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status.includes('공시') || status.includes('정정') || status.includes('수요')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status.includes('상장') && !status.includes('완료')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status.includes('진행')) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status.includes('예정')) return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  if (status.includes('마감') || status.includes('완료')) return 'border-slate-200 bg-slate-50 text-slate-500';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export function priorityClass(priority) {
  if (String(priority).includes('오늘')) return 'bg-slate-950 text-white';
  if (String(priority).includes('D-')) return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100';
  return 'bg-slate-100 text-slate-500';
}
