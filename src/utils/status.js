import { todayKst, toDateOnly } from './dates.js';

const ONE_DAY = 1000 * 60 * 60 * 24;

export const STATUS_LABELS = {
  open: '진행중',
  upcoming: '예정',
  closed: '마감',
  unknown: '확인 필요',
};

export function normalizeStatus(item) {
  const start = toDateOnly(item.scheduleStart);
  const end = toDateOnly(item.scheduleEnd || item.scheduleStart);
  const base = todayKst();

  if (!start || !end) return item.status || 'unknown';
  if (base >= start && base <= end) return 'open';
  if (base < start) return 'upcoming';
  return 'closed';
}

export function dDay(item) {
  const status = normalizeStatus(item);
  if (status === 'open') return '진행중';
  if (status === 'closed') return '마감';

  const start = toDateOnly(item.scheduleStart);
  if (!start) return '확인 필요';

  const diff = Math.ceil((start - todayKst()) / ONE_DAY);
  if (diff === 0) return '오늘';
  if (diff > 0) return `D-${diff}`;
  return '마감';
}
