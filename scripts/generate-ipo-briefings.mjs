import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { generateBriefingWithGemini, loadGeminiBriefingCache, saveGeminiBriefingCache } from './lib/gemini-briefings.mjs';
import { isSubscriptionDay, normalizeIpoItem } from './competition-parser.mjs';

const IPO_PATH = path.resolve('public/data/ipos.json');
const NEWS_PATH = path.resolve('public/data/news.json');
const MENTION_PATH = path.resolve('public/data/competition-mentions.json');
const SNAPSHOT_PATH = path.resolve('public/data/competition-snapshots.json');
const OUTPUT_PATH = path.resolve('public/data/ipo-briefings.json');

const COMPANY_CONTEXT = {
  빅웨이브로보틱스: '로봇 플랫폼 기업',
  스트라드비젼: '자율주행 인식 소프트웨어 기업',
  져스텍: '초정밀 모션제어 장비 기업',
  한국제16호스팩: '스팩 IPO 기업',
  매드업: 'AI 마케팅 솔루션 기업',
  레몬헬스케어: '헬스케어 플랫폼 기업',
};

function clean(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}
function shortDate(value) {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(5, 10).replace('-', '.');
  if (/^\d{8}$/.test(text)) return `${text.slice(4, 6)}.${text.slice(6, 8)}`;
  return text.slice(0, 10) || '일정 확인';
}
function dateLabel(value) {
  if (!value) return '기준 시각 확인';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return clean(value).replace('T', ' ').replace('+09:00', '').slice(5, 16);
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
}
function companyNameOf(item) {
  return clean(item.companyName || item.company || item.corpName || item.name);
}
function underwriterOf(item) {
  return clean(item.underwriter || item.leadManager || item.manager || '주관사 확인');
}
function contextOf(name) {
  return COMPANY_CONTEXT[name] || 'IPO 일정 확인 대상 기업';
}
function statusOf(item) {
  const raw = clean(item.status || item.stage);
  return ['예비심사', '예비심사', '청약 예정', '청약 진행중', '환불일', '상장', '상장'].includes(raw) ? raw : '예비심사';
}
function normalizeCompetitionCandidate(candidate) {
  if (!candidate || typeof candidate.value !== 'number' || !Number.isFinite(candidate.value) || candidate.value <= 0) return null;
  return { value: candidate.value, type: candidate.type || 'total', confidence: candidate.confidence === 'medium' ? 'medium' : 'low' };
}
function bestMentionCandidate(mention) {
  const rows = Array.isArray(mention?.candidates) ? mention.candidates.map(normalizeCompetitionCandidate).filter(Boolean) : [];
  return rows.find((row) => row.type === 'total' && row.confidence === 'medium') || rows.find((row) => row.type === 'total') || rows[0] || null;
}


function scheduleSourceLabel(item) {
  return item?.sourceMode === 'opendart' || item?.detailSource === 'document' ? 'DART 일정' : '일정 확인';
}

function hasDartExtractedDate(item, key) {
  const sourceKey = key === 'refundDate' ? 'refundDateSource' : 'listingDateSource';
  return Boolean(item?.[key] && (item?.[sourceKey] === 'dart-document' || item?.detailSource === 'document'));
}

function buildCompetition({ item, companyName, snapshots, mentions }) {
  if (!isSubscriptionDay(normalizeIpoItem(item))) return null;
  const snapshot = snapshots.find((row) => clean(row.companyName) === companyName && typeof row.totalCompetition === 'number' && row.totalCompetition > 0);
  if (snapshot) return {
    label: snapshot.sourceLabel || '확인 입력',
    value: snapshot.totalCompetition,
    proportionalValue: typeof snapshot.proportionalCompetition === 'number' && snapshot.proportionalCompetition > 0 ? snapshot.proportionalCompetition : null,
    timeLabel: dateLabel(snapshot.capturedKstTime || snapshot.capturedAt),
    sourceLine: clean(snapshot.underwriter || '주관사 확인'),
  };
  const mention = mentions.find((item) => clean(item.companyName) === companyName);
  const candidate = bestMentionCandidate(mention);
  if (!mention || !candidate) return null;
  return {
    label: '뉴스 언급',
    value: candidate.value,
    proportionalValue: null,
    timeLabel: clean(mention.articleTimeLabel) || dateLabel(mention.publishedAt),
    sourceLine: clean(mention.title || '기사 기준'),
  };
}
function pointsFor(status, hasCompetition) {
  if (status === '환불일') return ['환불일 확인', '상장일 확인', '원문 일정 대조'];
  if (status.includes('청약')) return hasCompetition ? ['청약 마감 시각 확인', '비례경쟁률 기준 확인', '정정 공시 여부 확인'] : ['청약 시작·마감일 확인', '환불일 확인', '정정 공시 여부 확인'];
  if (status === '예비심사') return ['예비심사 기간 확인', '공모가 확정 여부 확인', '주관사 공지 확인'];
  if (status.includes('상장')) return ['상장일 확인', '락업 물량 확인', '원문 일정 대조'];
  return ['예비심사 단계 확인', '청약 일정 확정 여부 확인', '원문 공시 대조'];
}
function hasBatchim(value) {
  const char = String(value || '').trim().slice(-1);
  if (!char) return false;
  const code = char.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}
function subjectName(name) {
  return `${name}${hasBatchim(name) ? '은' : '는'}`;
}
function localBriefing({ item, news, competition }) {
  const companyName = companyNameOf(item);
  const sector = contextOf(companyName);
  const ipoStage = statusOf(item);
  const underwriter = underwriterOf(item);
  const scheduleDate = shortDate(item.scheduleStart || item.subscriptionDate || item.date || item.reportDate || item.rceptDt);
  const refundDate = hasDartExtractedDate(item, 'refundDate') ? shortDate(item.refundDate) : '';
  const refundLine = refundDate ? `환불일 ${refundDate}` : ipoStage.includes('청약') ? '환불일 확인' : '';
  const sourceLabels = [scheduleSourceLabel(item), refundLine, competition?.label, news.length ? '뉴스 검색' : '', underwriter].filter(Boolean).slice(0, 4);
  const points = pointsFor(ipoStage, Boolean(competition));
  const activeSubscription = isSubscriptionDay(normalizeIpoItem(item));
  const scheduleCheckLine = refundLine ? `원문 일정, ${refundLine}, 변경 여부` : '원문 일정과 변경 여부';
  const competitionLine = competition
    ? `${competition.timeLabel} ${competition.label} 기준 청약 경쟁률과 ${refundLine || '환불일'}을 함께 확인합니다.`
    : ipoStage.includes('청약') && !activeSubscription
      ? `청약 시작 전 일정이라 ${scheduleCheckLine}를 함께 확인합니다.`
      : `${ipoStage} 단계라 원문 일정과 변경 여부를 함께 확인합니다.`;
  return {
    id: `briefing-${clean(item.id || companyName).replace(/\s+/g, '-').toLowerCase()}`,
    ipoId: clean(item.id || companyName),
    companyName,
    sector,
    ipoStage,
    underwriter,
    basisTimeLabel: competition?.timeLabel || '오늘 09:30 기준',
    oneLine: sector,
    body: `${subjectName(companyName)} ${sector}입니다. ${scheduleDate} 일정 기준으로 ${competitionLine}`.slice(0, 118),
    points,
    sourceLabels,
    competition,
    generatedBy: 'local-rules',
    model: null,
  };
}
function newsForCompany(newsItems, companyName) {
  return newsItems
    .filter((item) => clean(item.companyName || item.company || item.keyword) === companyName || clean(item.title).includes(companyName))
    .map((item) => ({ title: clean(item.title), provider: clean(item.provider || item.source), date: dateLabel(item.publishedAt || item.pubDate || item.date), text: clean(item.summary || item.description) }))
    .slice(0, 3);
}
function buildGeminiInput({ item, news, competition, fallback }) {
  return {
    companyName: fallback.companyName,
    sector: fallback.sector,
    ipoStage: fallback.ipoStage,
    underwriter: fallback.underwriter,
    schedule: {
      subscription: shortDate(item.scheduleStart || item.subscriptionDate || item.date),
      refund: hasDartExtractedDate(item, 'refundDate') ? shortDate(item.refundDate) : '',
      listing: hasDartExtractedDate(item, 'listingDate') ? shortDate(item.listingDate) : '',
    },
    news,
    competition,
    fallback: { oneLine: fallback.oneLine, body: fallback.body, points: fallback.points, sourceLabels: fallback.sourceLabels },
  };
}
async function main() {
  const [ipoJson, newsJson, mentionJson, snapshotJson] = await Promise.all([
    readJson(IPO_PATH, { items: [] }),
    readJson(NEWS_PATH, { items: [] }),
    readJson(MENTION_PATH, { items: [] }),
    readJson(SNAPSHOT_PATH, { items: [] }),
  ]);
  const ipoItems = Array.isArray(ipoJson.items) ? ipoJson.items : [];
  const newsItems = Array.isArray(newsJson.items) ? newsJson.items : [];
  const mentions = Array.isArray(mentionJson.items) ? mentionJson.items : [];
  const snapshots = Array.isArray(snapshotJson.items) ? snapshotJson.items : [];
  const cache = await loadGeminiBriefingCache();
  const items = [];
  let geminiUsed = 0;
  let cacheUsed = 0;
  for (const item of ipoItems.slice(0, 8)) {
    const companyName = companyNameOf(item);
    if (!companyName) continue;
    const news = newsForCompany(newsItems, companyName);
    const competition = buildCompetition({ item, companyName, snapshots, mentions });
    const fallback = localBriefing({ item, news, competition });
    const input = buildGeminiInput({ item, news, competition, fallback });
    const generated = await generateBriefingWithGemini({ input, fallback, cache });
    if (generated.used) geminiUsed += 1;
    if (generated.fromCache) cacheUsed += 1;
    items.push(generated.item);
  }
  await saveGeminiBriefingCache(cache);
  const payload = {
    metadata: {
      source: geminiUsed ? 'gemini-briefings-mixed' : 'local-rules',
      generatedAt: new Date().toISOString(),
      model: geminiUsed ? 'gemini-2.5-flash' : null,
      itemCount: items.length,
      geminiUsed,
      cacheUsed,
      policy: '회사 설명, IPO 단계, 일정, 경쟁률 뉴스 언급, 원문 확인 포인트만 표시합니다. 투자 판단 표현은 제외합니다.',
    },
    items,
  };
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`IPO 브리핑 파일 생성 완료: ${OUTPUT_PATH} (${items.length}개, Gemini ${geminiUsed}건, cache ${cacheUsed}건)`);
}

main().catch((error) => { console.error(error); process.exit(1); });
