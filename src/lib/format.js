export function cls(...values) {
  return values.filter(Boolean).join(' ');
}

export function normalizeText(value, fallback = '-') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

export function formatDateTime(value, fallback = '수집 대기') {
  const text = normalizeText(value, '');
  if (!text) return fallback;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.replace(/-/g, '.').slice(0, 16);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
}
