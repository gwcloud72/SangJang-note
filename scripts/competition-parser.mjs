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

const RETAIL_CONTEXT_RE = /(?:일반(?:투자자)?\s*(?:대상\s*)?(?:공모주\s*)?청약|일반\s*청약|공모주\s*청약|청약\s*(?:첫날|첫째날|둘째날|마감|최종|경쟁률|증거금|건수)|총\s*청약\s*경쟁률|비례\s*(?:배정\s*)?경쟁률|균등\s*(?:배정|청약)|청약자\s*수)/i;
const INSTITUTIONAL_CONTEXT_RE = /(?:기관(?:투자자)?\s*(?:대상|참여|경쟁률|수요)?|수요\s*예측|의무\s*보유|확약|참여\s*기관|공모가\s*(?:확정|밴드)|희망\s*공모가)/i;
const CONTEXT_RADIUS = 120;

function contextWindow(source, index, rawLength, radius = CONTEXT_RADIUS) {
  const center = Math.max(0, index) + Math.max(1, rawLength) / 2;
  const roughStart = Math.max(0, Math.floor(center - radius));
  const roughEnd = Math.min(source.length, Math.ceil(center + radius));
  const leftChunk = source.slice(roughStart, Math.max(roughStart, index));
  const rightChunk = source.slice(Math.max(0, index + rawLength), roughEnd);
  const leftBoundary = Math.max(
    leftChunk.lastIndexOf('.'), leftChunk.lastIndexOf('!'), leftChunk.lastIndexOf('?'),
    leftChunk.lastIndexOf('。'), leftChunk.lastIndexOf('！'), leftChunk.lastIndexOf('？'),
    leftChunk.lastIndexOf(';'), leftChunk.lastIndexOf('；'), leftChunk.lastIndexOf('…'),
  );
  const rightCandidates = ['.', '!', '?', '。', '！', '？', ';', '；', '…']
    .map((mark) => rightChunk.indexOf(mark))
    .filter((value) => value >= 0);
  const start = leftBoundary >= 0 ? roughStart + leftBoundary + 1 : roughStart;
  const end = rightCandidates.length ? Math.max(0, index + rawLength) + Math.min(...rightCandidates) + 1 : roughEnd;
  return source.slice(start, end).trim();
}

export function parseCompetitionCandidates(text, options = {}) {
  const source = cleanNewsText(text);
  const location = options && typeof options === 'object' ? String(options.location || 'text') : 'text';
  const candidates = [];
  for (const { type, re } of ratioPatterns) {
    re.lastIndex = 0;
    for (const match of source.matchAll(re)) {
      const value = Number(String(match[1] || '').replace(/,/g, ''));
      if (!Number.isFinite(value) || value <= 0) continue;
      if (type !== 'equalShares' && value > 1000000) continue;
      const index = Number.isInteger(match.index) ? match.index : source.indexOf(match[0]);
      candidates.push({
        type,
        value,
        raw: match[0],
        confidence: 'low',
        location,
        index,
        context: contextWindow(source, index, match[0].length),
        scope: 'unknown',
      });
    }
  }
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.location}:${candidate.type}:${candidate.value}:${candidate.index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compactEntity(value) {
  return cleanNewsText(value).replace(/[\s·ㆍ.,()\[\]{}'"-]/g, '');
}

function containsCompany(source, companyName) {
  const text = cleanNewsText(source);
  const company = cleanNewsText(companyName);
  if (!company) return false;
  return text.includes(company) || compactEntity(text).includes(compactEntity(company));
}

function allOccurrences(source, needle) {
  const indexes = [];
  if (!needle) return indexes;
  let from = 0;
  while (from <= source.length) {
    const index = source.indexOf(needle, from);
    if (index < 0) break;
    indexes.push(index);
    from = index + Math.max(1, needle.length);
  }
  return indexes;
}

function candidateOccurrences(source, candidate, location) {
  const rows = [];
  if (candidate?.location === location && Number.isInteger(candidate?.index) && candidate.index >= 0 && candidate.index < source.length) {
    rows.push({ index: candidate.index, raw: cleanNewsText(candidate.raw) || String(candidate.value) });
  }
  const raw = cleanNewsText(candidate?.raw);
  for (const index of allOccurrences(source, raw)) rows.push({ index, raw });
  if (!rows.length) {
    const parsed = parseCompetitionCandidates(source, { location });
    for (const item of parsed) {
      const sameType = !candidate?.type || candidate.type === 'unknown' || item.type === candidate.type;
      if (sameType && Number(item.value) === Number(candidate?.value)) rows.push({ index: item.index, raw: item.raw });
    }
  }
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.index}:${row.raw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nearestTextDistance(source, needle, center) {
  if (!needle) return Number.POSITIVE_INFINITY;
  const direct = allOccurrences(source, needle);
  const compactNeedle = compactEntity(needle);
  if (direct.length) return Math.min(...direct.map((index) => Math.abs(index + needle.length / 2 - center)));
  if (!compactNeedle) return Number.POSITIVE_INFINITY;
  const local = contextWindow(source, Math.max(0, Math.floor(center)), 1, CONTEXT_RADIUS);
  return compactEntity(local).includes(compactNeedle) ? 0 : Number.POSITIVE_INFINITY;
}

function nearestRegexDistance(source, pattern, center) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  let nearest = Number.POSITIVE_INFINITY;
  for (const match of source.matchAll(regex)) {
    const index = Number.isInteger(match.index) ? match.index : 0;
    const distance = Math.abs(index + match[0].length / 2 - center);
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

function analyzeOccurrence({ companyName, source, location, occurrence, candidate }) {
  const rawLength = Math.max(1, occurrence.raw.length);
  const center = occurrence.index + rawLength / 2;
  const context = contextWindow(source, occurrence.index, rawLength);
  const companyDistance = nearestTextDistance(source, companyName, center);
  const retailDistance = candidate.type === 'proportional' || candidate.type === 'equalShares'
    ? 0
    : nearestRegexDistance(source, RETAIL_CONTEXT_RE, center);
  const institutionalDistance = nearestRegexDistance(source, INSTITUTIONAL_CONTEXT_RE, center);
  const companyClose = companyDistance <= CONTEXT_RADIUS
    && (containsCompany(context, companyName) || (location === 'title' && containsCompany(source, companyName)));
  const retailClose = retailDistance <= CONTEXT_RADIUS;
  const institutionalOwnsNumber = institutionalDistance <= CONTEXT_RADIUS
    && (!retailClose || institutionalDistance <= retailDistance + 12);

  // 기관 수요예측 수치는 기업 귀속 여부와 무관하게 일반청약 후보에서 먼저 차단한다.
  if (institutionalOwnsNumber) return { accepted: false, reason: 'institutional_or_bookbuilding_ratio', context, location, companyDistance, retailDistance, institutionalDistance };
  if (!companyClose) return { accepted: false, reason: 'company_not_near_number', context, location, companyDistance, retailDistance, institutionalDistance };
  if (!retailClose) return { accepted: false, reason: 'retail_subscription_context_missing', context, location, companyDistance, retailDistance, institutionalDistance };
  return { accepted: true, reason: 'same_company_retail_subscription_ratio', context, location, companyDistance, retailDistance, institutionalDistance };
}

export function classifyCompetitionCandidate({ companyName, title, body, candidate }) {
  const titleText = cleanNewsText(title);
  const bodyText = cleanNewsText(body);
  const sources = candidate?.location === 'title'
    ? [{ location: 'title', source: titleText }]
    : candidate?.location === 'body'
      ? [{ location: 'body', source: bodyText }]
      : [{ location: 'title', source: titleText }, { location: 'body', source: bodyText }];
  const analyses = [];
  for (const entry of sources) {
    for (const occurrence of candidateOccurrences(entry.source, candidate, entry.location)) {
      analyses.push(analyzeOccurrence({ companyName, source: entry.source, location: entry.location, occurrence, candidate }));
    }
  }
  const accepted = analyses.find((item) => item.accepted);
  if (accepted) return { ...accepted, scope: 'retail-subscription' };
  return { ...(analyses[0] || { reason: 'candidate_not_found', context: '', location: candidate?.location || 'text' }), accepted: false, scope: 'rejected' };
}

export function scoreCandidate({ companyName, title, body, candidate }) {
  const classification = classifyCompetitionCandidate({ companyName, title, body, candidate });
  return classification.accepted ? 'medium' : 'low';
}

export function filterRetailCompetitionCandidates({ companyName, title, body, candidates }) {
  const rows = [];
  const seen = new Set();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const classification = classifyCompetitionCandidate({ companyName, title, body, candidate });
    if (!classification.accepted) continue;
    const key = `${candidate.type}:${candidate.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      ...candidate,
      confidence: scoreCandidate({ companyName, title, body, candidate }),
      scope: 'retail-subscription',
      context: classification.context,
      location: classification.location,
      validationReason: classification.reason,
    });
  }
  return rows;
}

function kstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { year: get('year'), month: get('month'), day: get('day'), hour, minute: get('minute') };
}

export function formatKstDateTime(date = new Date()) {
  const parts = kstParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}+09:00`;
}

export function formatKstArticleTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '기사 기준';
  const parts = kstParts(date);
  return `${parts.month}.${parts.day}.${parts.hour}:${parts.minute}`;
}

export function kstDateOnly(date = new Date()) {
  const parts = kstParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function kstDateOf(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : kstDateOnly(date);
}

export function isPublishedOnKstDate(value, target = new Date()) {
  const expected = typeof target === 'string' ? target.slice(0, 10) : kstDateOnly(target);
  return Boolean(expected && kstDateOf(value) === expected);
}

export function kstHour(date = new Date()) {
  return Number(kstParts(date).hour);
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
