import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  cleanNewsText,
  filterRetailCompetitionCandidates,
  formatKstArticleTime,
  formatKstDateTime,
  isCollectionHour,
  isPublishedOnKstDate,
  isSubscriptionDay,
  kstDateOnly,
  normalizeIpoItem,
  parseCompetitionCandidates,
  parsePublished,
  stableId,
} from './competition-parser.mjs';
import {
  geminiCompetitionSettings,
  loadGeminiCompetitionCache,
  refineCompetitionWithGemini,
  saveGeminiCompetitionCache,
} from './lib/gemini-competition.mjs';

const root = process.cwd();
const iposPath = path.join(root, 'public/data/ipos.json');
const outputPath = path.join(root, 'public/data/competition-mentions.json');
const endpoint = 'https://openapi.naver.com/v1/search/news.json';
const clientId = String(process.env.NEWS_CLIENT_ID || process.env.NAVER_CLIENT_ID || '').trim();
const clientSecret = String(process.env.NEWS_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET || '').trim();
const enabled = String(process.env.COMPETITION_NEWS_ENABLED || 'true').toLowerCase() !== 'false';
const display = Math.min(Math.max(Number(process.env.COMPETITION_NEWS_DISPLAY || 20), 1), 20);
const maxItems = Math.min(Math.max(Number(process.env.COMPETITION_NEWS_MAX_ITEMS || 60), 1), 100);
const requestPauseMs = Math.min(Math.max(Number(process.env.COMPETITION_NEWS_PAUSE_MS || 300), 0), 5000);
const allowOutsideHours = ['true', '1', 'yes', 'on'].includes(String(process.env.COMPETITION_ALLOW_OUTSIDE_HOURS || '').toLowerCase());
const vendor = 'Na' + 'ver';
const POLICY_VERSION = 'retail-same-company-same-day-v2';

async function readIpos() {
  if (!existsSync(iposPath)) return [];
  try {
    const payload = JSON.parse(await readFile(iposPath, 'utf8'));
    const items = Array.isArray(payload.items) ? payload.items : [];
    return items.map(normalizeIpoItem).filter((item) => item.companyName);
  } catch (error) {
    console.warn(`ipos.json 읽기 실패: ${error.message}`);
    return [];
  }
}

async function readPrevious() {
  if (!existsSync(outputPath)) return { metadata: {}, items: [] };
  try { return JSON.parse(await readFile(outputPath, 'utf8')); }
  catch { return { metadata: {}, items: [] }; }
}

async function searchNews(query) {
  const url = new URL(endpoint);
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('start', '1');
  url.searchParams.set('sort', 'date');
  const response = await fetch(url, {
    headers: {
      [`X-${vendor}-Client-Id`]: clientId,
      [`X-${vendor}-Client-Secret`]: clientSecret,
    },
  });
  if (!response.ok) throw new Error(`news search failed ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

function articleKey(companyName, item) {
  return `${companyName}:${String(item?.originallink || item?.link || item?.title || '')}`;
}

function compactCandidates(candidates) {
  return (Array.isArray(candidates) ? candidates : []).map((candidate) => ({
    type: candidate.type,
    value: candidate.value,
    raw: cleanNewsText(candidate.raw).slice(0, 100),
    confidence: candidate.confidence === 'medium' ? 'medium' : 'low',
    parser: candidate.parser || 'regex',
    scope: 'retail-subscription',
  }));
}

function compactMention({ ipo, query, item, publishedAt, candidates, extraction }) {
  const title = cleanNewsText(item.title || '');
  const body = cleanNewsText(item.description || '');
  const articleUrl = String(item.originallink || item.link || '');
  return {
    id: stableId(`${ipo.id}:${articleUrl || title}`, 'mention'),
    ipoId: ipo.id,
    companyName: ipo.companyName,
    sourceType: 'naver_news',
    displayLabel: '뉴스 언급',
    competitionScope: 'retail-subscription',
    title,
    articleText: body,
    publisher: '뉴스 검색',
    publishedAt,
    articleTimeLabel: formatKstArticleTime(publishedAt),
    link: item.link || articleUrl,
    originallink: articleUrl || item.link || '',
    query,
    candidates: compactCandidates(candidates),
    extraction,
    collectedAt: new Date().toISOString(),
  };
}

function validatePreviousItems(previous, activeIpos, todayKst) {
  const activeByName = new Map(activeIpos.map((ipo) => [ipo.companyName, ipo]));
  const validated = [];
  for (const item of Array.isArray(previous?.items) ? previous.items : []) {
    const companyName = cleanNewsText(item.companyName);
    if (!activeByName.has(companyName)) continue;
    if (!isPublishedOnKstDate(item.publishedAt, todayKst)) continue;
    const candidates = filterRetailCompetitionCandidates({
      companyName,
      title: item.title,
      body: item.articleText,
      candidates: item.candidates,
    });
    if (!candidates.some((candidate) => candidate.type === 'total')) continue;
    validated.push({
      ...item,
      competitionScope: 'retail-subscription',
      candidates: compactCandidates(candidates),
    });
  }
  return validated;
}

function buildPayload({ items, activeIpoCount, geminiSettings, stats, reason = '' }) {
  return {
    metadata: {
      source: geminiSettings.enabled ? 'naver-news-search-gemini-assisted' : 'naver-news-search',
      displayLabel: '뉴스 언급',
      updatedAt: new Date().toISOString(),
      updatedKst: formatKstDateTime(),
      referenceDate: kstDateOnly(),
      policyVersion: POLICY_VERSION,
      policy: '당일 기사에서 같은 회사와 같은 문맥에 있는 일반투자자 청약 경쟁률만 저장합니다.',
      parserPolicy: '기관 수요예측 경쟁률, 다른 회사 숫자, 날짜 없는 기사, 전일 이전 기사는 제외합니다.',
      activeIpoCount,
      itemCount: items.length,
      reason,
      gemini: {
        enabled: geminiSettings.enabled,
        model: geminiSettings.enabled ? geminiSettings.model : null,
        maxCalls: geminiSettings.maxCalls,
        minRegexConfidence: geminiSettings.minRegexConfidence,
        onlyWhenRegex: geminiSettings.onlyWhenRegex,
        accepted: stats.geminiAccepted,
        rejected: stats.geminiRejected,
        cacheHits: stats.cacheHits,
        regexOnly: stats.regexOnly,
      },
      rejected: {
        staleOrUndated: stats.staleOrUndated,
        entityOrScope: stats.entityOrScope,
      },
    },
    items,
  };
}

async function writePayload(payload) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const todayKst = kstDateOnly();
  const ipos = await readIpos();
  const activeIpos = ipos.filter((ipo) => isSubscriptionDay(ipo));
  const previous = await readPrevious();
  const currentPrevious = validatePreviousItems(previous, activeIpos, todayKst);
  const geminiSettings = geminiCompetitionSettings();
  const stats = { geminiAccepted: 0, geminiRejected: 0, regexOnly: 0, cacheHits: 0, staleOrUndated: 0, entityOrScope: 0 };

  if (!activeIpos.length) {
    await writePayload(buildPayload({ items: [], activeIpoCount: 0, geminiSettings, stats, reason: '오늘 청약 진행 종목 없음' }));
    console.log('오늘 청약 진행 종목이 없어 경쟁률 뉴스 언급을 비웠습니다.');
    return;
  }
  if (!enabled) {
    await writePayload(buildPayload({ items: currentPrevious, activeIpoCount: activeIpos.length, geminiSettings, stats, reason: '수집 비활성화: 당일 검증 데이터만 유지' }));
    console.log('경쟁률 뉴스 수집 비활성화: 당일 검증 데이터만 유지했습니다.');
    return;
  }
  if (!clientId || !clientSecret) {
    await writePayload(buildPayload({ items: currentPrevious, activeIpoCount: activeIpos.length, geminiSettings, stats, reason: '뉴스 인증값 없음: 당일 검증 데이터만 유지' }));
    console.log('뉴스 검색 인증값 미설정: 당일 검증 경쟁률 데이터만 유지했습니다.');
    return;
  }
  if (!allowOutsideHours && !isCollectionHour()) {
    await writePayload(buildPayload({ items: currentPrevious, activeIpoCount: activeIpos.length, geminiSettings, stats, reason: 'KST 09~16시 외: 당일 검증 데이터만 유지' }));
    console.log('KST 09~16시가 아니라 신규 수집은 건너뛰고 당일 검증 데이터만 유지했습니다.');
    return;
  }

  const previousByArticle = new Set(currentPrevious.map((item) => articleKey(item.companyName, item)));
  const processedArticles = new Set(previousByArticle);
  const rows = [];
  const geminiCache = await loadGeminiCompetitionCache();

  for (const ipo of activeIpos) {
    const queries = [
      `${ipo.companyName} 일반청약 경쟁률`,
      `${ipo.companyName} 청약 경쟁률`,
      `${ipo.companyName} 비례 경쟁률`,
    ];
    for (const query of queries) {
      try {
        const items = await searchNews(query);
        for (const item of items) {
          const title = cleanNewsText(item.title || '');
          const body = cleanNewsText(item.description || '');
          const publishedAt = parsePublished(item.pubDate);
          if (!publishedAt || !isPublishedOnKstDate(publishedAt, todayKst)) {
            stats.staleOrUndated += 1;
            continue;
          }
          const key = articleKey(ipo.companyName, item);
          if (processedArticles.has(key)) continue;
          processedArticles.add(key);

          const rawCandidates = [
            ...parseCompetitionCandidates(title, { location: 'title' }),
            ...parseCompetitionCandidates(body, { location: 'body' }),
          ];
          const regexCandidates = filterRetailCompetitionCandidates({ companyName: ipo.companyName, title, body, candidates: rawCandidates });
          if (!regexCandidates.length) {
            stats.entityOrScope += rawCandidates.length ? 1 : 0;
            continue;
          }

          const refined = await refineCompetitionWithGemini({ ipo, newsItem: item, title, body, regexCandidates, cache: geminiCache, query });
          const finalCandidates = filterRetailCompetitionCandidates({ companyName: ipo.companyName, title, body, candidates: refined.candidates });
          if (!finalCandidates.some((candidate) => candidate.type === 'total')) {
            if (refined.method === 'gemini_rejected') stats.geminiRejected += 1;
            stats.entityOrScope += 1;
            continue;
          }
          if (refined.method === 'gemini' || refined.method === 'gemini_cache' || refined.method === 'gemini_confirmed') stats.geminiAccepted += 1;
          if (refined.method === 'gemini_cache') stats.cacheHits += 1;
          if (refined.method === 'regex') stats.regexOnly += 1;
          rows.push(compactMention({
            ipo,
            query,
            item,
            publishedAt,
            candidates: finalCandidates,
            extraction: {
              method: refined.method,
              model: refined.model,
              cacheKey: refined.key,
              reason: refined.reason,
              policyVersion: POLICY_VERSION,
            },
          }));
        }
      } catch (error) {
        console.warn(`${ipo.companyName}: ${error.message}`);
      }
      if (requestPauseMs) await new Promise((resolve) => setTimeout(resolve, requestPauseMs));
    }
  }

  await saveGeminiCompetitionCache(geminiCache);

  const merged = [...currentPrevious, ...rows];
  const deduped = [...new Map(merged.map((item) => [articleKey(item.companyName, item), item])).values()]
    .filter((item) => isPublishedOnKstDate(item.publishedAt, todayKst))
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .slice(0, maxItems);
  await writePayload(buildPayload({ items: deduped, activeIpoCount: activeIpos.length, geminiSettings, stats }));
  console.log(`competition mentions written: ${deduped.length} item(s), new=${rows.length}, staleRejected=${stats.staleOrUndated}, scopeRejected=${stats.entityOrScope}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
