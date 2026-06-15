import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MIN_PAUSE_MS = 5000;
const DEFAULT_MAX_CALLS = 8;
const DEFAULT_MAX_INPUT_CHARS = 3000;
const CACHE_PATH = path.resolve('public/data/competition-gemini-cache.json');
let lastRequestAt = 0;
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
function cleanText(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function cropText(value, maxChars = DEFAULT_MAX_INPUT_CHARS) {
  const text = cleanText(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 20))} …`;
}
function safeNumber(value) {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
}
function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
async function waitForSlot(pauseMs) {
  const now = Date.now();
  const waitMs = Math.max(0, lastRequestAt + pauseMs - now);
  await sleep(waitMs);
  lastRequestAt = Date.now();
}
function retryDelayMs(response, attempt, pauseMs) {
  const retryAfter = Number(response?.headers?.get?.('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.max(pauseMs, retryAfter * 1000);
  return pauseMs * (attempt + 1);
}
function parseGeminiJson(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new Error('empty Gemini response');
  try { return JSON.parse(trimmed); }
  catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini JSON object not found');
    return JSON.parse(match[0]);
  }
}
function extractGeminiText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
}
function normalizeModel(raw) {
  const value = String(raw || '').trim();
  if (/^gemini-[a-z0-9.\-]*flash[a-z0-9.\-]*$/i.test(value) && !/pro/i.test(value)) return value;
  return DEFAULT_MODEL;
}
function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}
function cacheKey({ ipo, newsItem, title }) {
  const article = newsItem?.originallink || newsItem?.link || title || '';
  return hash(`${ipo?.id || ipo?.companyName || ''}:${article}`);
}

export function geminiCompetitionSettings() {
  return {
    apiKey: cleanEnv('GEMINI_API_KEY') || cleanEnv('GOOGLE_API_KEY'),
    enabled: truthy(cleanEnv('GEMINI_COMPETITION_ENABLED')),
    model: normalizeModel(cleanEnv('GEMINI_COMPETITION_MODEL') || cleanEnv('GEMINI_MODEL')),
    pauseMs: parseInteger(cleanEnv('GEMINI_COMPETITION_PAUSE_MS') || cleanEnv('GEMINI_REQUEST_PAUSE_MS'), MIN_PAUSE_MS, MIN_PAUSE_MS, 60000),
    maxCalls: parseInteger(cleanEnv('GEMINI_COMPETITION_MAX_CALLS'), DEFAULT_MAX_CALLS, 0, 20),
    maxInputChars: parseInteger(cleanEnv('GEMINI_COMPETITION_MAX_INPUT_CHARS') || cleanEnv('GEMINI_MAX_INPUT_CHARS'), DEFAULT_MAX_INPUT_CHARS, 1200, 12000),
    maxRetries: parseInteger(cleanEnv('GEMINI_COMPETITION_MAX_RETRIES') || cleanEnv('GEMINI_MAX_RETRIES'), 1, 0, 3),
    minRegexConfidence: cleanEnv('GEMINI_COMPETITION_MIN_REGEX_CONFIDENCE') === 'medium' ? 'medium' : 'low',
    onlyWhenRegex: cleanEnv('GEMINI_COMPETITION_ONLY_WHEN_REGEX') ? truthy(cleanEnv('GEMINI_COMPETITION_ONLY_WHEN_REGEX')) : (!truthy(cleanEnv('COMPETITION_GEMINI_PARSE_AMBIGUOUS') || cleanEnv('GEMINI_COMPETITION_PARSE_AMBIGUOUS')) && !truthy(cleanEnv('GEMINI_COMPETITION_ALLOW_NO_REGEX'))), 
  };
}

// previousByArticle: 기사별 Gemini 결과 캐시로 동일 기사 재호출을 막습니다.
export async function loadGeminiCompetitionCache() {
  if (!existsSync(CACHE_PATH)) return new Map();
  try {
    const payload = JSON.parse(await readFile(CACHE_PATH, 'utf8'));
    const items = Array.isArray(payload.items) ? payload.items : [];
    return new Map(items.map((item) => [item.key, item]));
  } catch {
    return new Map();
  }
}

export async function saveGeminiCompetitionCache(cache) {
  const items = [...(cache instanceof Map ? cache.values() : [])]
    .filter((item) => item && item.key)
    .slice(-300);
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify({ metadata: { updatedAt: new Date().toISOString(), source: 'gemini-competition-cache' }, items }, null, 2)}\n`, 'utf8');
}

function responseSchema() {
  return {
    type: 'object',
    properties: {
      isCompetitionArticle: { type: 'boolean' },
      companyName: { type: 'string' },
      capturedKstTime: { type: 'string' },
      reason: { type: 'string' },
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['total', 'proportional', 'equalShares', 'unknown'] },
            value: { type: 'number' },
            raw: { type: 'string' },
            confidence: { type: 'string', enum: ['low', 'medium'] },
          },
          required: ['type', 'value', 'raw', 'confidence'],
        },
      },
    },
    required: ['isCompetitionArticle', 'companyName', 'capturedKstTime', 'reason', 'candidates'],
  };
}

function shouldAskGemini({ text, regexCandidates, settings }) {
  if (!settings.enabled || !settings.apiKey || settings.maxCalls <= 0) return false;
  if (callsThisRun >= settings.maxCalls) return false;
  const source = cleanText(text);
  const hasKeywords = /(청약|공모주|IPO|아이피오)/.test(source) && /(경쟁률|총경쟁률|비례|균등|배정|대\s*1|:1)/.test(source);
  if (!hasKeywords) return false;
  const rows = Array.isArray(regexCandidates) ? regexCandidates : [];
  if (rows.some((item) => item.type === 'total' && item.confidence === 'medium')) return false;
  if (settings.onlyWhenRegex && rows.length === 0) return false;
  if (settings.minRegexConfidence === 'medium' && rows.length && !rows.some((item) => item.confidence === 'medium')) return false;
  return rows.length > 0 || /(대\s*1|:1|\d+(?:\.\d+)?\s*주)/.test(source);
}

function buildPrompt({ ipo, title, body, query, regexCandidates }, settings) {
  const payload = {
    expectedCompanyName: ipo?.companyName || '',
    underwriter: ipo?.underwriter || '',
    query,
    title: cropText(title, 700),
    description: cropText(body, 1200),
    regexCandidates: (Array.isArray(regexCandidates) ? regexCandidates : []).slice(0, 4),
  };
  return cropText([
    '너는 IPO 청약 경쟁률 뉴스 파서다. 아래 입력에 명시된 숫자만 구조화한다.',
    'JSON 객체만 반환한다. 마크다운, 설명문, 코드블록 금지.',
    '규칙:',
    '- 예상 회사명과 다른 기사면 isCompetitionArticle=false, candidates=[]로 둔다.',
    '- 기사에 없는 숫자는 절대 추정하지 않는다.',
    '- 경쟁률/총경쟁률/비례경쟁률/균등 배정 키워드 주변 숫자만 추출한다.',
    '- 날짜, 공모가, 청약일, D-Day, 시간 숫자를 경쟁률로 착각하지 않는다.',
    '- 뉴스 출처이므로 confidence는 low 또는 medium만 허용한다. verified/high 금지.',
    '- displayLabel, 권위 단정, 최신 단정 표현은 만들지 않는다.',
    '반환 형식:',
    '{"isCompetitionArticle":true,"companyName":"회사명","capturedKstTime":"HH:MM 또는 기사 기준","reason":"짧은 판단 근거","candidates":[{"type":"total","value":82.4,"raw":"경쟁률 82.4대 1","confidence":"medium"}]}',
    `입력: ${JSON.stringify(payload)}`,
  ].join('\n'), settings.maxInputChars);
}

function normalizeCandidates(payload, expectedCompanyName) {
  const isArticle = Boolean(payload?.isCompetitionArticle);
  const companyName = cleanText(payload?.companyName || '');
  if (!isArticle) return [];
  if (expectedCompanyName && companyName && !companyName.includes(expectedCompanyName) && !expectedCompanyName.includes(companyName)) return [];
  const seen = new Set();
  const rows = [];
  for (const row of Array.isArray(payload?.candidates) ? payload.candidates : []) {
    const type = ['total', 'proportional', 'equalShares'].includes(String(row?.type)) ? String(row.type) : null;
    const value = safeNumber(row?.value);
    if (!type || value === null) continue;
    if (type !== 'equalShares' && value > 1000000) continue;
    const key = `${type}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ type, value, raw: cropText(row?.raw || `${value}`, 80), confidence: row?.confidence === 'medium' ? 'medium' : 'low', parser: 'gemini' });
  }
  return rows;
}

export function mergeCompetitionCandidates(regexCandidates, geminiCandidates) {
  const merged = [];
  const seen = new Set();
  for (const source of [geminiCandidates, regexCandidates]) {
    for (const row of Array.isArray(source) ? source : []) {
      const type = ['total', 'proportional', 'equalShares', 'unknown'].includes(String(row?.type)) ? String(row.type) : 'unknown';
      const value = safeNumber(row?.value);
      if (value === null) continue;
      const key = `${type}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ type, value, raw: cropText(row?.raw || `${value}`, 80), confidence: row?.confidence === 'medium' ? 'medium' : 'low', parser: row?.parser || (source === geminiCandidates ? 'gemini' : 'regex') });
    }
  }
  return merged.slice(0, 4);
}


async function callGemini({ prompt, settings, withSchema = true }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
  const generationConfig = { temperature: 0, topP: 0.8, responseMimeType: 'application/json', maxOutputTokens: 1024 };
  if (withSchema) generationConfig.responseSchema = responseSchema();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`Gemini competition API ${response.status}: ${body.slice(0, 240)}`);
    error.status = response.status;
    error.response = response;
    throw error;
  }
  return response.json();
}

export async function refineCompetitionWithGemini({ ipo, newsItem, title, body, regexCandidates, cache, query }) {
  const settings = geminiCompetitionSettings();
  const text = `${title || ''} ${body || ''}`;
  const key = cacheKey({ ipo, newsItem, title });
  if (cache?.has?.(key)) {
    const cached = cache.get(key);
    return { method: cached.candidates?.length ? 'gemini_cache' : 'gemini_rejected', key, model: cached.model || null, reason: cached.reason || 'cache', candidates: cached.candidates || [] };
  }
  if (!shouldAskGemini({ text, regexCandidates, settings })) {
    return { method: regexCandidates?.length ? 'regex' : 'none', key, model: null, reason: 'regex_only', candidates: regexCandidates || [] };
  }
  callsThisRun += 1;
  const prompt = buildPrompt({ ipo, title, body, query, regexCandidates }, settings);
  let lastError = null;
  for (let attempt = 0; attempt <= settings.maxRetries; attempt += 1) {
    await waitForSlot(settings.pauseMs);
    try {
      let responsePayload;
      try { responsePayload = await callGemini({ prompt, settings, withSchema: true }); }
      catch (error) { if (Number(error.status) === 400) responsePayload = await callGemini({ prompt, settings, withSchema: false }); else throw error; }
      const parsed = parseGeminiJson(extractGeminiText(responsePayload));
      const geminiCandidates = normalizeCandidates(parsed, ipo?.companyName || '');
      const candidates = mergeCompetitionCandidates(regexCandidates, geminiCandidates);
      const method = geminiCandidates.length ? 'gemini' : 'gemini_rejected';
      const result = { key, method, model: settings.model, reason: cropText(parsed?.reason || method, 120), candidates, updatedAt: new Date().toISOString() };
      cache?.set?.(key, result);
      return result;
    } catch (error) {
      lastError = error;
      if ([408, 409, 429, 500, 502, 503, 504].includes(Number(error.status)) && attempt < settings.maxRetries) {
        await sleep(retryDelayMs(error.response, attempt, settings.pauseMs));
        continue;
      }
      break;
    }
  }
  console.log(`Gemini 경쟁률 보조 파싱 건너뜀: ${lastError?.message || 'unknown error'}`);
  return { method: regexCandidates?.length ? 'regex' : 'none', key, model: settings.model, reason: 'fallback', candidates: regexCandidates || [] };
}
