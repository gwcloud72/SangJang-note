import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const errors = [];
const warnings = [];

function valueOf(name) {
 const value = process.env[name];
 return value === undefined ? '' : String(value).trim();
}

function optionalBoolean(name) {
 const value = valueOf(name).toLowerCase();
 if (!value) return;
 if (!['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value)) {
  errors.push(`${name}: boolean 문자열이어야 합니다. 예: true 또는 false`);
 }
}

function optionalInteger(name, { min = -Infinity, max = Infinity } = {}) {
 const raw = valueOf(name);
 if (!raw) return;
 const number = Number(raw);
 if (!Number.isInteger(number)) {
  errors.push(`${name}: 정수 문자열이어야 합니다. 현재값=${raw}`);
  return;
 }
 if (number < min || number > max) errors.push(`${name}: ${min}~${max} 범위여야 합니다. 현재값=${raw}`);
}

function optionalGeminiModel() {
 const raw = valueOf('GEMINI_MODEL');
 if (!raw) return;
 if (!/^gemini-[a-z0-9.\-]*flash[a-z0-9.\-]*$/i.test(raw) || /pro/i.test(raw)) {
  errors.push('GEMINI_MODEL: Flash 계열 모델만 허용됩니다. 예: gemini-2.5-flash');
 }
}

function truthy(value) {
 return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

try {
 require('../tailwind.config.cjs');
} catch (error) {
 errors.push(`tailwind.config.cjs 로드 실패: ${error.message}`);
}

optionalInteger('LOOKBACK_DAYS', { min: 1, max: 3650 });
optionalInteger('LOOKAHEAD_DAYS', { min: 1, max: 3650 });
optionalInteger('DART_LIST_CHUNK_DAYS', { min: 1, max: 100 });
optionalInteger('DART_DOCUMENT_PAUSE_MS', { min: 0, max: 5000 });
optionalBoolean('NEWS_FETCH_ENABLED');
optionalInteger('NEWS_DISPLAY', { min: 1, max: 20 });
optionalInteger('NEWS_MAX_ITEMS', { min: 1, max: 100 });
optionalBoolean('FRED_FETCH_ENABLED');
optionalInteger('FRED_MAX_OBSERVATIONS', { min: 2, max: 120 });
optionalBoolean('GEMINI_REPORTS_ENABLED');
optionalInteger('GEMINI_REQUEST_PAUSE_MS', { min: 5000, max: 60000 });
optionalInteger('GEMINI_MAX_INPUT_CHARS', { min: 4000, max: 60000 });
optionalInteger('GEMINI_MAX_RETRIES', { min: 0, max: 4 });
optionalGeminiModel();

if (!valueOf('DART_API_KEY')) warnings.push('DART 인증 정보가 설정되지 않으면 Actions는 수집을 건너뛰고 데이터 연결 확인 화면으로 배포합니다.');
const hasNewsId = Boolean(valueOf('NEWS_CLIENT_ID'));
const hasNewsSecret = Boolean(valueOf('NEWS_CLIENT_SECRET'));
if (hasNewsId !== hasNewsSecret) errors.push('NEWS_CLIENT_ID와 NEWS_CLIENT_SECRET은 함께 설정해야 합니다.');
if (!hasNewsId && !hasNewsSecret) warnings.push('뉴스 연동 정보가 설정되지 않으면 뉴스 탭은 기본 표시 데이터로 배포됩니다.');

const fredEnabled = ['true', '1', 'yes', 'on'].includes(valueOf('FRED_FETCH_ENABLED').toLowerCase());
const hasFred = Boolean(valueOf('FRED_API_KEY'));
if (fredEnabled) {
 if (!hasFred) errors.push('FRED_FETCH_ENABLED=true이면 FRED_API_KEY가 필요합니다.');
} else if (!hasFred) {
 warnings.push('FRED 연동 정보가 설정되지 않으면 시장환경은 기본 표시 데이터로 표시됩니다.');
}
if (truthy(valueOf('GEMINI_REPORTS_ENABLED')) && !valueOf('GEMINI_API_KEY')) {
 errors.push('GEMINI_REPORTS_ENABLED=true이면 GEMINI_API_KEY가 필요합니다.');
}

if (warnings.length) {
 console.log('actions:check warnings');
 warnings.forEach((message) => console.log(`- ${message}`));
}
if (errors.length) {
 console.error('actions:check failed');
 errors.forEach((message) => console.error(`- ${message}`));
 process.exit(1);
}
console.log('actions:check passed');
