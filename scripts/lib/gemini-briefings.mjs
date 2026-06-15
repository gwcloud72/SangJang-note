import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cropText, generateGeminiJson, geminiApiKey, geminiIsEnabled, resolveGeminiModel } from './gemini-flash.mjs';

const CACHE_PATH = path.resolve('public/data/ipo-briefings-gemini-cache.json');
const DEFAULT_MAX_CALLS = 6;
let callsThisRun = 0;

function cleanEnv(name) {
  return String(process.env[name] ?? '').trim();
}
function truthy(value) {
  return ['true', '1', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}
function parseInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}
export function briefingInputKey(input) {
  return hash(JSON.stringify(input));
}
export function geminiBriefingSettings() {
  return {
    apiKey: geminiApiKey(),
    enabled: geminiIsEnabled('GEMINI_BRIEFINGS_ENABLED'),
    model: resolveGeminiModel(),
    maxCalls: parseInteger(cleanEnv('GEMINI_BRIEFINGS_MAX_CALLS'), DEFAULT_MAX_CALLS, 0, 20),
    onlyWhenSignal: !truthy(cleanEnv('GEMINI_BRIEFINGS_INCLUDE_ALL')),
  };
}
export async function loadGeminiBriefingCache() {
  if (!existsSync(CACHE_PATH)) return new Map();
  try {
    const payload = JSON.parse(await readFile(CACHE_PATH, 'utf8'));
    const items = Array.isArray(payload.items) ? payload.items : [];
    return new Map(items.map((item) => [item.key, item]));
  } catch {
    return new Map();
  }
}
export async function saveGeminiBriefingCache(cache) {
  const items = [...(cache instanceof Map ? cache.values() : [])].filter((item) => item?.key).slice(-240);
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify({ metadata: { updatedAt: new Date().toISOString(), source: 'gemini-briefing-cache' }, items }, null, 2)}\n`, 'utf8');
}
function normalizeArray(value, limit, maxLen = 36) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cropText(item, maxLen))
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, limit);
}
function hasForbiddenText(text) {
  return /추천|권유|매수|매도|수익률|수익|저평가|고평가|상승\s*가능|흥행\s*확실|투자\s*매력/i.test(String(text ?? ''));
}
function normalizeBriefingPayload(payload, fallback) {
  const oneLine = cropText(payload?.oneLine || fallback.oneLine, 46);
  const body = cropText(payload?.body || fallback.body, 118);
  const points = normalizeArray(payload?.points, 3, 26);
  const sourceLabels = normalizeArray(payload?.sourceLabels, 4, 18);
  const safe = {
    ...fallback,
    oneLine: hasForbiddenText(oneLine) ? fallback.oneLine : oneLine,
    body: hasForbiddenText(body) ? fallback.body : body,
    points: points.length && !hasForbiddenText(points.join(' ')) ? points : fallback.points,
    sourceLabels: sourceLabels.length ? sourceLabels : fallback.sourceLabels,
  };
  return safe;
}
function validateBriefingPayload(payload) {
  return Boolean(payload && typeof payload === 'object' && typeof payload.oneLine === 'string' && typeof payload.body === 'string' && Array.isArray(payload.points) && Array.isArray(payload.sourceLabels));
}
function shouldAskGemini(input, settings) {
  if (!settings.enabled || !settings.apiKey || settings.maxCalls <= 0) return false;
  if (callsThisRun >= settings.maxCalls) return false;
  if (!settings.onlyWhenSignal) return true;
  return Boolean(input?.competition?.value || input?.news?.length || String(input?.ipoStage || '').includes('청약'));
}
export async function generateBriefingWithGemini({ input, fallback, cache }) {
  const settings = geminiBriefingSettings();
  const key = briefingInputKey(input);
  const cached = cache?.get?.(key);
  if (cached?.briefing) return { item: { ...fallback, ...cached.briefing, generatedBy: 'gemini-cache', model: cached.model || null }, used: false, fromCache: true, model: cached.model || null };
  if (!shouldAskGemini(input, settings)) return { item: fallback, used: false, fromCache: false, model: null };
  callsThisRun += 1;
  const schema = JSON.stringify({
    oneLine: '회사 한 줄 설명. 46자 이내',
    body: '회사 상황과 IPO 단계, 확인할 점을 중립적으로 설명. 118자 이내',
    points: ['확인 포인트 1', '확인 포인트 2', '확인 포인트 3'],
    sourceLabels: ['근거 라벨'],
  });
  const result = await generateGeminiJson({
    enabledEnv: 'GEMINI_BRIEFINGS_ENABLED',
    task: '상장노트 회사별 IPO 브리핑을 생성합니다. 투자 추천·권유·주가 전망은 금지하고, 회사 설명·IPO 단계·일정·원문 확인 포인트만 씁니다.',
    schema,
    input: {
      ...input,
      hardRules: [
        '기사와 공시 입력에 없는 숫자는 만들지 않는다',
        '투자 추천, 매수, 매도, 수익률, 저평가, 상장 후 전망 표현 금지',
        '경쟁률이 뉴스 출처이면 뉴스 언급이라고만 표현',
        '확인 포인트는 원문·마감시각·정정 공시·주관사 공지 중심',
      ],
    },
    fallback,
    validate: validateBriefingPayload,
    maxOutputTokens: 1024,
    temperature: 0.15,
  });
  const item = result.used ? normalizeBriefingPayload(result.payload, fallback) : fallback;
  if (result.used) {
    const cachedItem = { key, model: result.model, briefing: item, updatedAt: new Date().toISOString() };
    cache?.set?.(key, cachedItem);
  }
  return { item: { ...item, generatedBy: result.used ? 'gemini' : fallback.generatedBy, model: result.used ? result.model : null }, used: result.used, fromCache: false, model: result.model };
}
