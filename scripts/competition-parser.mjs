import { createHash } from 'node:crypto';

export function cleanNewsText(input) {
  return String(input || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stableId(value, prefix = 'item') {
  const hash = createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
  return `${prefix}-${hash}`;
}

export function parsePublished(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

const ratioPatterns = [
  {
    type: 'proportional',
    re: /비례\s*(?:경쟁률)?\s*(?:은|는|이|가|:)?\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:대\s*1|:1|대)/g,
  },
  {
    type: 'total',
    re: /(?:청약\s*)?(?:경쟁률|총경쟁률)\s*(?:은|는|이|가|:)?\s*([0-9][0-9,]*(?:\.\d+)?)\s*(?:대\s*1|:1|대)/g,
  },
  {
    type: 'total',
    re: /([0-9][0-9,]*(?:\.\d+)?)\s*(?:대\s*1|:1|대)\s*(?:의\s*)?(?:경쟁률|청약\s*경쟁률)/g,
  },
  {
    type: 'equalShares',
    re: /균등(?:\s*배정)?(?:\s*예상)?\s*([0-9]+(?:\.\d+)?)\s*주/g,
  },
];

export function parseCompetitionCandidates(text) {
  const source = cleanNewsText(text);
  const candidates = [];
  for (const { type, re } of ratioPatterns) {
    re.lastIndex = 0;
    for (const match of source.matchAll(re)) {
      const value = Number(String(match[1] || '').replace(/,/g, ''));
      if (!Number.isFinite(value) || value <= 0) continue;
      if (type !== 'equalShares' && value > 1000000) continue;
      candidates.push({ type, value, raw: match[0], confidence: 'low' });
    }
  }
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.type}:${candidate.value}:${candidate.raw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scoreCandidate({ companyName, title, body, candidate }) {
  const titleText = cleanNewsText(title);
  const bodyText = cleanNewsText(body);
  const full = `${titleText} ${bodyText}`;
  let score = 0;
  if (companyName && titleText.includes(companyName)) score += 3;
  if (companyName && bodyText.includes(companyName)) score += 1;
  if (/청약|공모주|IPO|아이피오/.test(full)) score += 2;
  if (/경쟁률|비례경쟁률|균등/.test(full)) score += 2;
  if (/마감|최종|오후\s*\d+시|기준|첫날|둘째날|청약일/.test(full)) score += 1;
  if (candidate.type === 'proportional') score += 1;
  return score >= 6 ? 'medium' : 'low';
}

export function formatKstDateTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date).replace(' ', 'T') + '+09:00';
}

export function kstDateOnly(date = new Date()) {
  return formatKstDateTime(date).slice(0, 10);
}

export function kstHour(date = new Date()) {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false }).format(date);
  return Number(hour);
}

export function isCollectionHour(date = new Date()) {
  const hour = kstHour(date);
  return hour >= 9 && hour <= 16;
}

export function normalizeIpoItem(item, index = 0) {
  const companyName = String(item?.companyName || item?.company || item?.corpName || item?.name || '').trim();
  const id = String(item?.id || companyName || `ipo-${index}`).trim();
  const start = String(item?.subscriptionStart || item?.subscriptionDate || '').trim();
  const end = String(item?.subscriptionEnd || item?.subscriptionDate || start).trim();
  const underwriter = String(item?.leadManager || item?.manager || item?.underwriter || '').trim();
  const status = String(item?.status || item?.stage || '').trim();
  return { id, companyName, underwriter, status, subscriptionStart: normalizeDate(start), subscriptionEnd: normalizeDate(end) };
}

export function normalizeDate(value) {
  const text = String(value || '').trim();
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  if (/^\d{4}\.\d{2}\.\d{2}/.test(text)) return text.replaceAll('.', '-').slice(0, 10);
  return '';
}

export function isSubscriptionDay(ipo, date = new Date()) {
  const today = kstDateOnly(date);
  const start = normalizeDate(ipo.subscriptionStart);
  const end = normalizeDate(ipo.subscriptionEnd || ipo.subscriptionStart);
  if (!start || !end) return false;
  if (ipo.status && !String(ipo.status).includes('청약')) return false;
  return start <= today && today <= end;
}
