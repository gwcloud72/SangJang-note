import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { generateGeminiJson } from './lib/gemini-flash.mjs';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'public', 'data');
const FRED_PATH = path.join(DATA_DIR, 'fred-macro.json');
const REPORT_PATH = path.join(DATA_DIR, 'fred-macro-report.json');
const BLOCKED_TEXT_PATTERN = new RegExp(['G[e]mini', '\uC81C\uBBF8\uB098\uC774', '\uBAA9\uC5C5', '\uC0D8\uD50C', '\uB370\uBAA8', '\uC784\uC2DC', '\uB370\uC774\uD130\\s*\uC5C6\uC74C', '\uD22C\uC790\\s*\uAD8C\uC720', '\uC218\uC775\uB960', '\uB9E4\uC218', '\uB9E4\uB3C4', '\uCD94\uCC9C', '\uAD8C\uC720'].join('|'), 'i');
const SERIES = [
  { seriesId: 'FEDFUNDS', koreanName: '미국 기준금리', unit: '%', decimals: 2 },
  { seriesId: 'DGS10', koreanName: '미국 10년물 국채금리', unit: '%', decimals: 2 },
  { seriesId: 'CPIAUCSL', koreanName: '미국 소비자물가지수 CPI', unit: 'index', decimals: 1 },
  { seriesId: 'UNRATE', koreanName: '미국 실업률', unit: '%', decimals: 1 },
];

function env(name) {
  return String(process.env[name] || '').trim();
}

function failRequiredSecret(name) {
  console.error(`${name}가 설정되어 있지 않습니다. GitHub Secrets에 ${name}을 등록한 뒤 다시 실행하세요.`);
  process.exit(1);
}

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === '.') return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

async function readExistingJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fetchFredSeries(series, apiKey) {
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.searchParams.set('series_id', series.seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '60');

  const response = await fetch(url);
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`FRED ${series.seriesId} 요청 실패: ${response.status} ${message.slice(0, 180)}`);
  }

  const payload = await response.json();
  const observations = Array.isArray(payload.observations) ? payload.observations : [];
  const validDesc = observations
    .map((item) => ({ date: String(item.date || ''), value: numberOrNull(item.value) }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.value !== null);

  if (validDesc.length < 1) {
    return {
      seriesId: series.seriesId,
      koreanName: series.koreanName,
      unit: series.unit,
      latestDate: null,
      latestValue: null,
      previousDate: null,
      previousValue: null,
      change: null,
      changeRate: null,
      observations: [],
    };
  }

  const latest = validDesc[0];
  const previous = validDesc[1] || null;
  const change = previous ? round(latest.value - previous.value, series.decimals) : null;
  const changeRate = previous && previous.value !== 0 ? round(((latest.value - previous.value) / previous.value) * 100, 2) : null;
  const chart = [...validDesc]
    .reverse()
    .slice(-24)
    .map((item) => ({ date: item.date, value: round(item.value, series.decimals) }));

  return {
    seriesId: series.seriesId,
    koreanName: series.koreanName,
    unit: series.unit,
    latestDate: latest.date,
    latestValue: round(latest.value, series.decimals),
    previousDate: previous?.date || null,
    previousValue: previous ? round(previous.value, series.decimals) : null,
    change,
    changeRate,
    observations: chart,
  };
}

function formatValue(item) {
  if (item.latestValue === null) return '확인 예정';
  if (item.unit === '%') return `${item.latestValue}%`;
  return `${item.latestValue}`;
}

function directionText(item) {
  if (!Number.isFinite(item.change) || item.change === 0) return '보합 흐름입니다';
  return item.change > 0 ? '상승 흐름입니다' : '하락 흐름입니다';
}

function buildReportItems(items) {
  return items.map((item) => ({
    seriesId: item.seriesId,
    koreanName: item.koreanName,
    plainSummary: item.latestValue === null ? `${item.koreanName} 최신값을 확인 중입니다.` : `${item.koreanName} 최신값은 ${formatValue(item)}이며 ${directionText(item)}.`,
    ipoContext: 'IPO 일정과 함께 확인할 수 있는 시장환경 지표입니다.',
    caution: '공시와 시장 지표를 함께 확인하세요.',
  }));
}

function cleanText(value, fallback, maxLength = 140) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text || BLOCKED_TEXT_PATTERN.test(text)) return fallback;
  return text.slice(0, maxLength);
}

function validateGeminiMacroPayload(payload) {
  return Boolean(payload && typeof payload === 'object' && Array.isArray(payload.items));
}

function mergeReportItems(localItems, incomingItems) {
  if (!Array.isArray(incomingItems)) return localItems;
  const byId = new Map(incomingItems.map((item) => [String(item?.seriesId || ''), item]));
  return localItems.map((item) => {
    const incoming = byId.get(item.seriesId);
    if (!incoming || typeof incoming !== 'object') return item;
    return {
      ...item,
      plainSummary: cleanText(incoming.plainSummary, item.plainSummary),
      ipoContext: cleanText(incoming.ipoContext, item.ipoContext),
      caution: cleanText(incoming.caution, item.caution),
    };
  });
}

async function buildFinalReportItems(macroItems) {
  const localItems = buildReportItems(macroItems);
  const geminiResult = await generateGeminiJson({
    task: 'IPO 시장환경 화면에 표시할 거시지표 요약을 지표별 3문장으로 다듬습니다.',
    schema: '{"items":[{"seriesId":"원본 seriesId","plainSummary":"문장","ipoContext":"문장","caution":"문장"}]}',
    input: {
      items: macroItems.map((item) => ({
        seriesId: item.seriesId,
        koreanName: item.koreanName,
        unit: item.unit,
        latestDate: item.latestDate,
        latestValue: item.latestValue,
        previousValue: item.previousValue,
        change: item.change,
        changeRate: item.changeRate,
        observations: item.observations.slice(-8),
      })),
      localItems,
      outputRules: ['입력 숫자만 사용', '투자 판단 표현 금지', '각 문장 100자 이내'],
    },
    fallback: { items: localItems },
    validate: validateGeminiMacroPayload,
  });
  return {
    items: mergeReportItems(localItems, geminiResult.payload?.items),
    source: geminiResult.used ? 'gemini-flash-local-rules' : 'local-rules',
    model: geminiResult.used ? geminiResult.model : null,
  };
}

await mkdir(DATA_DIR, { recursive: true });

const fredApiKey = env('FRED_API_KEY');
if (!fredApiKey) failRequiredSecret('FRED_API_KEY');

const previousFred = await readExistingJson(FRED_PATH, null);

let macroItems = [];
try {
  macroItems = await Promise.all(SERIES.map((series) => fetchFredSeries(series, fredApiKey)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (previousFred?.items?.length) {
    console.error('FRED 수집 실패. 기존 fred-macro.json을 유지합니다.');
    process.exit(0);
  }
  process.exit(1);
}

const now = new Date().toISOString();
const fredPayload = {
  metadata: {
    source: 'FRED',
    updatedAt: now,
    generatedAt: now,
    seriesCount: SERIES.length,
  },
  items: macroItems,
};
await writeFile(FRED_PATH, `${JSON.stringify(fredPayload, null, 2)}\n`);
console.log(`FRED macro data written: ${macroItems.length} series`);

const finalReport = await buildFinalReportItems(macroItems);
const reportPayload = {
  metadata: {
    source: finalReport.source,
    generatedAt: now,
    model: finalReport.model,
  },
  items: finalReport.items,
};
await writeFile(REPORT_PATH, `${JSON.stringify(reportPayload, null, 2)}\n`);
console.log(`FRED macro report written: ${macroItems.length} item(s)`);
