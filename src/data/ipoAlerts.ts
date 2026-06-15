import type { Company, IpoStatus } from './model';

export type IpoAlertKind = '예비심사' | '수요예측' | '청약 예정' | '청약 진행중' | '환불일' | '상장';

export interface IpoAlertItem {
  kind: IpoAlertKind;
  title: string;
  label: string;
  dateLabel: string;
  sourceLabel: string;
  priority: number;
  status: IpoStatus;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;
  const normalized = /^\d{8}$/.test(text) ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}` : text;
  const date = new Date(`${normalized.slice(0, 10)}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(referenceDate: string, target?: string): number | null {
  const ref = parseDate(referenceDate);
  const next = parseDate(target);
  if (!ref || !next) return null;
  return Math.round((next.getTime() - ref.getTime()) / 86400000);
}

export function dateCompact(value?: string): string {
  if (!value) return '확인';
  const text = value.trim();
  if (/^\d{8}$/.test(text)) return `${text.slice(4, 6)}.${text.slice(6, 8)}`;
  if (text.includes('-')) return text.slice(5, 10).replace('-', '.');
  return text || '확인';
}

export function dateRangeCompact(start?: string, end?: string): string {
  if (!start && !end) return '확인';
  if (start && end && start !== end) return `${dateCompact(start)}–${dateCompact(end)}`;
  return dateCompact(start || end);
}

function dDayLabel(days: number | null, fallback: string): string {
  if (days === null) return fallback;
  if (days === 0) return '오늘';
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

function isInRange(referenceDate: string, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  return start <= referenceDate && referenceDate <= end;
}

export function buildIpoAlert(company: Company, referenceDate: string): IpoAlertItem {
  const start = company.subscriptionStart;
  const end = company.subscriptionEnd || company.subscriptionStart;
  const refund = company.refundDate;
  const listing = company.listingDate;
  const subscriptionLabel = dateRangeCompact(start, end);

  if (start && end && isInRange(referenceDate, start, end)) {
    const left = daysBetween(referenceDate, end);
    const label = left === 0 ? '오늘 마감' : `${dDayLabel(left, '마감일 확인')} 마감`;
    return {
      kind: '청약 진행중',
      title: '청약 마감 알림',
      label,
      dateLabel: `청약 ${subscriptionLabel}`,
      sourceLabel: '경쟁률 수집 대상',
      priority: 1,
      status: '청약 진행중',
    };
  }

  if (start && referenceDate < start) {
    const left = daysBetween(referenceDate, start);
    return {
      kind: '청약 예정',
      title: '청약 시작 알림',
      label: `${dDayLabel(left, '시작일 확인')} 시작`,
      dateLabel: `청약 ${subscriptionLabel}`,
      sourceLabel: 'DART 일정 기준',
      priority: 2,
      status: '청약 예정',
    };
  }

  if (end && refund && end < referenceDate && referenceDate <= refund) {
    const left = daysBetween(referenceDate, refund);
    return {
      kind: '환불일',
      title: '환불일 알림',
      label: left === 0 ? '오늘 환불' : `${dDayLabel(left, '환불일 확인')} 환불`,
      dateLabel: `환불 ${dateCompact(refund)}`,
      sourceLabel: 'DART 원문 기준',
      priority: 3,
      status: '환불일',
    };
  }

  if (listing && referenceDate <= listing) {
    const left = daysBetween(referenceDate, listing);
    return {
      kind: '상장',
      title: '상장일 알림',
      label: left === 0 ? '오늘 상장' : `${dDayLabel(left, '상장일 확인')} 상장`,
      dateLabel: `상장 ${dateCompact(listing)}`,
      sourceLabel: 'DART 원문 기준',
      priority: 4,
      status: '상장',
    };
  }

  return {
    kind: '예비심사',
    title: '일정 확정 대기',
    label: '청약일 확인',
    dateLabel: company.date ? `${dateCompact(company.scheduleStart || company.date)} 일정` : '원문 일정 확인',
    sourceLabel: 'DART 일정 기준',
    priority: 5,
    status: '예비심사',
  };
}

export function sortByAlertPriority(companies: Company[], referenceDate: string): Company[] {
  return [...companies].sort((a, b) => {
    const alertA = buildIpoAlert(a, referenceDate);
    const alertB = buildIpoAlert(b, referenceDate);
    if (alertA.priority !== alertB.priority) return alertA.priority - alertB.priority;
    const dateA = a.subscriptionStart || a.refundDate || a.listingDate || a.scheduleStart || a.date;
    const dateB = b.subscriptionStart || b.refundDate || b.listingDate || b.scheduleStart || b.date;
    return String(dateA).localeCompare(String(dateB));
  });
}
