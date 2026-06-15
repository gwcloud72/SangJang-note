import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve('public/data');
const fileOf = (name) => path.join(dataDir, `${name}.json`);
const nowIso = () => new Date().toISOString();

async function readJson(name, fallback = {}) {
  const file = fileOf(name);
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { return fallback; }
}

async function writeJson(name, payload) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(fileOf(name), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function text(value) { return String(value ?? '').trim(); }
function todayFrom(payload) { return text(payload?.metadata?.referenceDate || payload?.metadata?.updatedKst || payload?.metadata?.updatedAt).slice(0, 10) || new Date().toISOString().slice(0, 10); }
function isActiveSubscription(item, today) {
  const status = text(item.status);
  const start = text(item.subscriptionStart || item.scheduleStart).slice(0, 10);
  const end = text(item.subscriptionEnd || item.scheduleEnd || start).slice(0, 10);
  return status === '청약 진행중' && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && start <= today && today <= end;
}
function emptyMeta(source, ipos, extra = {}) {
  return { source, updatedAt: nowIso(), updatedKst: ipos?.metadata?.updatedKst || null, referenceDate: todayFrom(ipos), itemCount: 0, ...extra };
}

async function main() {
  const ipos = await readJson('ipos', { metadata: {}, items: [] });
  const items = Array.isArray(ipos.items) ? ipos.items : [];
  const today = todayFrom(ipos);
  const names = new Set(items.map((item) => text(item.companyName || item.company)).filter(Boolean));
  const ids = new Set(items.map((item) => text(item.id || item.ipoId)).filter(Boolean));
  const activeNames = new Set(items.filter((item) => isActiveSubscription(item, today)).map((item) => text(item.companyName || item.company)).filter(Boolean));

  if (!items.length) {
    await writeJson('news', { metadata: emptyMeta('sanitized-empty-ipo-news', ipos, { notice: '표시 가능한 IPO 일정이 없어 관련 뉴스 데이터를 비웠습니다.' }), items: [] });
    await writeJson('competition-snapshots', { metadata: emptyMeta('sanitized-empty-competition-confirmed', ipos, { displayLabel: '확인 입력', activeIpoCount: 0, policy: '청약 진행중인 기업이 없어 경쟁률 데이터를 비웠습니다.' }), items: [] });
    await writeJson('competition-mentions', { metadata: emptyMeta('sanitized-empty-competition-news', ipos, { displayLabel: '뉴스 언급', activeIpoCount: 0, policy: '청약 진행중인 기업이 없어 경쟁률 뉴스 언급을 비웠습니다.' }), items: [] });
    await writeJson('ipo-briefings', { metadata: emptyMeta('sanitized-empty-ipo-briefings', ipos, { geminiUsed: 0, cacheUsed: 0, policy: '표시 가능한 IPO 일정이 없어 회사별 브리핑을 비웠습니다.' }), items: [] });
    await writeJson('ipo-ai-report', { metadata: emptyMeta('sanitized-empty-ipo-report', ipos, { generatedAt: null, model: null, scope: 'github-pages-v1' }), lines: [] });
    console.log('sanitize-derived-data: IPO 0건이라 파생 데이터를 모두 빈 상태로 정리했습니다.');
    return;
  }

  const news = await readJson('news', { metadata: {}, items: [] });
  if (Array.isArray(news.items)) {
    const filtered = news.items.filter((item) => names.has(text(item.companyName || item.company || item.keyword)));
    if (filtered.length !== news.items.length) await writeJson('news', { ...news, metadata: { ...(news.metadata || {}), sanitizedAt: nowIso(), itemCount: filtered.length }, items: filtered });
  }

  for (const name of ['competition-snapshots', 'competition-mentions']) {
    const payload = await readJson(name, { metadata: {}, items: [] });
    if (!Array.isArray(payload.items)) continue;
    const filtered = payload.items.filter((item) => activeNames.has(text(item.companyName || item.company)));
    if (filtered.length !== payload.items.length) {
      await writeJson(name, { ...payload, metadata: { ...(payload.metadata || {}), sanitizedAt: nowIso(), activeIpoCount: activeNames.size, policy: '청약 진행중인 기업의 경쟁률만 유지합니다.' }, items: filtered });
    }
  }

  const briefings = await readJson('ipo-briefings', { metadata: {}, items: [] });
  if (Array.isArray(briefings.items)) {
    const filtered = briefings.items.filter((item) => ids.has(text(item.ipoId)) || names.has(text(item.companyName || item.company)));
    if (filtered.length !== briefings.items.length) await writeJson('ipo-briefings', { ...briefings, metadata: { ...(briefings.metadata || {}), sanitizedAt: nowIso(), itemCount: filtered.length }, items: filtered });
  }

  console.log(`sanitize-derived-data: IPO ${items.length}건, 청약 진행중 ${activeNames.size}건 기준으로 파생 데이터를 점검했습니다.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
