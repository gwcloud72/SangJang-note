export function toDateOnly(value) {
  if (!value) return null;
  const normalized = String(value).replaceAll('.', '-').replaceAll('/', '-').slice(0, 10);
  const date = new Date(`${normalized}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayKst() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${value.year}-${value.month}-${value.day}T00:00:00+09:00`);
}

export function getTodayLabel() {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(new Date());
}

export function formatDate(value) {
  const date = toDateOnly(value);
  if (!date) return value || '-';

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function dateRange(item) {
  if (item.scheduleStart && item.scheduleEnd && item.scheduleStart !== item.scheduleEnd) {
    return `${formatDate(item.scheduleStart)} ~ ${formatDate(item.scheduleEnd)}`;
  }

  if (item.scheduleStart) return formatDate(item.scheduleStart);
  return item.subscriptionDate || '-';
}
