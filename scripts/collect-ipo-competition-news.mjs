import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  cleanNewsText,
  formatKstDateTime,
  isCollectionHour,
  isSubscriptionDay,
  normalizeIpoItem,
  parseCompetitionCandidates,
  parsePublished,
  scoreCandidate,
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

function compactMention({ ipo, query, item, candidates, extraction }) {
  const title = cleanNewsText(item.title || '');
  const body = cleanNewsText(item.description || '');
  const articleUrl = String(item.originallink || item.link || '');
  const publishedAt = parsePublished(item.pubDate);
  return {
    id: stableId(`${ipo.id}:${articleUrl || title}`, 'mention'),
    ipoId: ipo.id,
    companyName: ipo.companyName,
    sourceType: 'naver_news',
    displayLabel: '뉴스 언급',
    title,
    articleText: body,
    publisher: '뉴스 검색',
    publishedAt,
    articleTimeLabel: publishedAt ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(publishedAt)).replace(/\.\s?/g, '.').replace(',', '') : '기사 기준',
    link: item.link || articleUrl,
    originallink: articleUrl || item.link || '',
    query,
    candidates,
    extraction,
    collectedAt: new Date().toISOString(),
  };
}

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });
  if (!enabled) {
    console.log('경쟁률 뉴스 언급 수집 비활성화: 기존 데이터를 유지합니다.');
    return;
  }
  if (!clientId || !clientSecret) {
    console.log('뉴스 검색 인증값 미설정: 기존 경쟁률 뉴스 언급 데이터를 유지합니다.');
    return;
  }
  if (!allowOutsideHours && !isCollectionHour()) {
    console.log('KST 09~16시가 아니라 경쟁률 뉴스 언급 수집을 건너뜁니다.');
    return;
  }
  const ipos = await readIpos();
  const activeIpos = ipos.filter((ipo) => isSubscriptionDay(ipo));
  if (!activeIpos.length) {
    const emptyPayload = {
      metadata: {
        source: 'github-actions:naver-news-gemini',
        displayLabel: '뉴스 언급',
        updatedAt: new Date().toISOString(),
        updatedKst: formatKstDateTime(),
        activeIpoCount: 0,
        policy: '청약 진행일에만 경쟁률 뉴스 언급을 저장합니다.',
      },
      items: [],
    };
    await writeFile(outputPath, JSON.stringify(emptyPayload, null, 2) + '\n');
    console.log('오늘 청약 진행 종목이 없어 경쟁률 뉴스 언급을 비웠습니다.');
    return;
  }

  const previous = await readPrevious();
  const previousByArticle = new Map((Array.isArray(previous.items) ? previous.items : [])
    .filter((item) => Array.isArray(item.candidates) && item.candidates.length)
    .map((item) => [item.originallink || item.link || item.title, item]));

  const rows = [];
  const geminiCache = await loadGeminiCompetitionCache();
  const geminiSettings = geminiCompetitionSettings();
  let geminiAccepted = 0;
  let geminiRejected = 0;
  let regexOnly = 0;
  let cacheHits = 0;

  for (const ipo of activeIpos) {
    const queries = [
      `${ipo.companyName} 청약 경쟁률`,
      `${ipo.companyName} 공모주 경쟁률`,
      `${ipo.companyName} 비례 경쟁률`,
    ];
    for (const query of queries) {
      try {
        const items = await searchNews(query);
        for (const item of items) {
          const title = cleanNewsText(item.title || '');
          const body = cleanNewsText(item.description || '');
          const text = `${title} ${body}`;
          if (!title.includes(ipo.companyName) && !body.includes(ipo.companyName)) continue;
          const articleKey = String(item.originallink || item.link || title);
          if (previousByArticle.has(articleKey)) continue;
          const regexCandidates = parseCompetitionCandidates(text).map((candidate) => ({
            ...candidate,
            confidence: scoreCandidate({ companyName: ipo.companyName, title, body, candidate }),
          }));
          const refined = await refineCompetitionWithGemini({ ipo, newsItem: item, title, body, regexCandidates, cache: geminiCache, query });
          if (!refined.candidates.length) {
            if (refined.method === 'gemini_rejected') geminiRejected += 1;
            continue;
          }
          if (refined.method === 'gemini' || refined.method === 'gemini_cache') geminiAccepted += 1;
          if (refined.method === 'gemini_cache') cacheHits += 1;
          if (refined.method === 'regex') regexOnly += 1;
          rows.push(compactMention({
            ipo,
            query,
            item,
            candidates: refined.candidates,
            extraction: {
              method: refined.method,
              model: refined.model,
              cacheKey: refined.key,
              reason: refined.reason,
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

  const merged = [...(Array.isArray(previous.items) ? previous.items : []), ...rows];
  const deduped = [...new Map(merged.map((item) => [item.originallink || item.link || item.title, item])).values()]
    .sort((a, b) => String(b.publishedAt || b.collectedAt || '').localeCompare(String(a.publishedAt || a.collectedAt || '')))
    .slice(0, maxItems);
  const payload = {
    metadata: {
      source: geminiSettings.enabled ? 'naver-news-search-gemini-assisted' : 'naver-news-search',
      displayLabel: '뉴스 언급',
      updatedAt: new Date().toISOString(),
      updatedKst: formatKstDateTime(),
      policy: '뉴스 제목과 요약에서 경쟁률 후보만 추출하며 확인값으로 단정하지 않습니다.',
      parserPolicy: 'regex 1차 필터 후 후보 기사만 Gemini Flash로 구조화합니다.',
      activeIpoCount: activeIpos.length,
      gemini: {
        enabled: geminiSettings.enabled,
        model: geminiSettings.enabled ? geminiSettings.model : null,
        maxCalls: geminiSettings.maxCalls,
        minRegexConfidence: geminiSettings.minRegexConfidence,
        onlyWhenRegex: geminiSettings.onlyWhenRegex,
        accepted: geminiAccepted,
        rejected: geminiRejected,
        cacheHits,
        regexOnly,
      },
    },
    items: deduped,
  };
  await writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`competition mentions written: ${deduped.length} item(s), new=${rows.length}, geminiAccepted=${geminiAccepted}, regexOnly=${regexOnly}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
