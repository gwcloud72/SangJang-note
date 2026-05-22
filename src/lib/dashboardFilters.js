import { matchesPeriod } from './ipoData.js';

export const SORT_OPTIONS = [
  { label: '청약 빠른순', value: 'subscription-asc' },
  { label: '상장 빠른순', value: 'listing-asc' },
  { label: '상태순', value: 'status-asc' },
  { label: '기업명', value: 'company-asc' },
];
export const DEFAULT_FILTERS = { query: '', market: '전체 시장', status: '전체', period: '이번 달', sort: 'subscription-asc' };
const LEGACY_SORT_VALUES = new Map(SORT_OPTIONS.map((option) => [option.label, option.value]));


export function normalizeSort(value) {
  return LEGACY_SORT_VALUES.get(value) || SORT_OPTIONS.find((option) => option.value === value)?.value || DEFAULT_FILTERS.sort;
}

export function hasActiveFilters(filters) {
  return normalize(filters?.query) !== ''
    || filters?.market !== DEFAULT_FILTERS.market
    || filters?.status !== DEFAULT_FILTERS.status
    || filters?.period !== DEFAULT_FILTERS.period
    || normalizeSort(filters?.sort) !== DEFAULT_FILTERS.sort;
}

export function normalize(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function getItemTime(item, key) {
  const text = String(item?.[key] || '').match(/(\d{1,2})[.\/-](\d{1,2})/);
  if (!text) return 9999;
  return Number(text[1]) * 100 + Number(text[2]);
}

export function filterItems(items, filters, referenceDate) {
  const query = normalize(filters.query);
  return items.filter((item) => {
    const haystack = normalize(`${item.company} ${item.market} ${item.sector} ${item.manager} ${item.status} ${item.filingType} ${item.filingNote}`);
    const matchesQuery = !query || haystack.includes(query);
    const matchesMarket = filters.market === '전체 시장' || item.market === filters.market;
    const matchesStatus = filters.status === '전체' || item.status.includes(filters.status.replace('중', ''));
    const matchesPeriodValue = matchesPeriod(item, filters.period, referenceDate);
    return matchesQuery && matchesMarket && matchesStatus && matchesPeriodValue;
  });
}

export function sortItems(items, sort) {
  const list = [...items];
  if (sort === 'listing-asc') return list.sort((a, b) => getItemTime(a, 'listing') - getItemTime(b, 'listing'));
  if (sort === 'status-asc') return list.sort((a, b) => String(a.status).localeCompare(String(b.status), 'ko-KR'));
  if (sort === 'company-asc') return list.sort((a, b) => a.company.localeCompare(b.company, 'ko-KR'));
  return list.sort((a, b) => getItemTime(a, 'subscription') - getItemTime(b, 'subscription'));
}

export function isPriorityDisclosure(item) {
  const text = `${item.filingType} ${item.filingNote} ${item.status}`;
  return /정정|수요|증권신고|투자설명|진행|오늘|D-/.test(text);
}

export function priorityLabel(item) {
  if (/정정/.test(item.filingType)) return '정정';
  if (/수요/.test(`${item.filingType} ${item.filingNote}`)) return '수요예측';
  if (/증권신고/.test(`${item.filingType} ${item.filingNote}`)) return '신고서';
  if (/진행/.test(item.status)) return '진행';
  return '확인';
}
