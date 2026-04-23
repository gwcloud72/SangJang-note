function parseNumeric(value) {
  const digits = String(value ?? '').replace(/[^0-9.-]/g, '');
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isNaN(amount) ? null : amount;
}

export function formatPrice(value) {
  const amount = parseNumeric(value);
  if (amount === null) return value || '미정';
  if (amount <= 0) return '미정';
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatAmount(value) {
  const amount = parseNumeric(value);
  if (amount === null) return value || '미정';
  if (amount <= 0) return '미정';

  if (amount >= 1_0000_0000_0000) {
    return `${(amount / 1_0000_0000_0000).toFixed(2)}조원`;
  }

  if (amount >= 1_0000_0000) {
    return `${(amount / 1_0000_0000).toFixed(1)}억원`;
  }

  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatTextList(values, fallback = '확인 필요') {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  return values.filter(Boolean).join(', ') || fallback;
}

export function formatRatio(value, fallback = '추후 공시 확인') {
  const text = String(value || '').trim();
  if (!text) return fallback;

  const match = text.match(/([0-9][0-9,]*(?:\.\d+)?)\s*(?:대|[:：])\s*1/i);
  if (!match) return text;
  return `${match[1]} 대 1`;
}

export function formatCount(value, unit = '주', fallback = '미공시') {
  const amount = parseNumeric(value);
  if (amount === null) return value || fallback;
  if (amount <= 0) return fallback;
  return `${amount.toLocaleString('ko-KR')}${unit}`;
}
