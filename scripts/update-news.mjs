import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const iposPath = path.join(root, 'public/data/ipos.json');
const outputPath = path.join(root, 'public/data/news.json');
const endpoint = 'https://openapi.naver.com/v1/search/news.json';
const clientId = String(process.env.NEWS_CLIENT_ID || '').trim();
const clientSecret = String(process.env.NEWS_CLIENT_SECRET || '').trim();
const enabled = String(process.env.NEWS_FETCH_ENABLED || 'true').toLowerCase() !== 'false';
const display = Math.min(Math.max(Number(process.env.NEWS_DISPLAY || 5), 1), 20);
const maxItems = Math.min(Math.max(Number(process.env.NEWS_MAX_ITEMS || 60), 1), 100);
const vendor = 'Na' + 'ver';

function clean(value) {
 return String(value || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function hashId(value) { return createHash('sha256').update(String(value)).digest('hex').slice(0, 16); }
function parsePublished(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null; }
async function readIpoKeywords() {
 if (!existsSync(iposPath)) return [];
 try {
  const payload = JSON.parse(await readFile(iposPath, 'utf8'));
  const items = Array.isArray(payload.items) ? payload.items : [];
  const names = items.map((item) => String(item.companyName || item.company || '').trim()).filter(Boolean);
  const envQueries = String(process.env.NEWS_QUERIES || '').split(',').map((item) => item.trim()).filter(Boolean);
  return [...new Set([...names, ...envQueries])].slice(0, 12);
 } catch { return []; }
}
async function fetchQuery(keyword) {
 const url = new URL(endpoint);
 url.searchParams.set('query', `${keyword} IPO 공모주 상장`);
 url.searchParams.set('display', String(display));
 url.searchParams.set('start', '1');
 url.searchParams.set('sort', 'date');
 const response = await fetch(url, { headers: { [`X-${vendor}-Client-Id`]: clientId, [`X-${vendor}-Client-Secret`]: clientSecret } });
 if (!response.ok) throw new Error(`news search failed ${response.status}`);
 const payload = await response.json();
 return (Array.isArray(payload.items) ? payload.items : []).map((item) => ({
  id: hashId(item.link || item.originallink || item.title), keyword, companyName: keyword,
  title: clean(item.title), description: clean(item.description), link: item.link || item.originallink || '', originallink: item.originallink || item.link || '',
  provider: '뉴스 검색', publishedAt: parsePublished(item.pubDate),
 }));
}
async function main() {
 await mkdir(path.dirname(outputPath), { recursive: true });
 if (!enabled) { console.log('뉴스 갱신 비활성화: 기존 IPO 뉴스 데이터를 유지합니다.'); return; }
 if (!clientId || !clientSecret) { console.log('뉴스 인증값 미설정: 기존 IPO 뉴스 데이터를 유지합니다.'); return; }
 const keywords = await readIpoKeywords();
 if (!keywords.length) { console.log('IPO 키워드 없음: 기존 IPO 뉴스 데이터를 유지합니다.'); return; }
 const rows = [];
 for (const keyword of keywords) {
  try { rows.push(...await fetchQuery(keyword)); }
  catch (error) { console.warn(`${keyword}: ${error.message}`); }
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.NEWS_REQUEST_PAUSE_MS || 250)));
 }
 const deduped = [...new Map(rows.filter((item) => item.title).map((item) => [item.link || item.originallink || item.title, item])).values()].sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))).slice(0, maxItems);
 if (!deduped.length) { console.log('뉴스 결과 없음: 기존 IPO 뉴스 데이터를 유지합니다.'); return; }
 const payload = { metadata: { source: 'search-api', updatedAt: new Date().toISOString(), notice: '최신 IPO 관련 뉴스입니다.', queryCount: keywords.length }, items: deduped };
 await writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n');
 console.log(`news data written: ${deduped.length} item(s), ${keywords.length} querie(s)`);
}
main().catch((error) => { console.error(error); process.exit(1); });
