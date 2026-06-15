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

function hasGeminiKey() {
 return Boolean(valueOf('GEMINI_API_KEY') || valueOf('GOOGLE_API_KEY'));
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
optionalBoolean('COMPETITION_NEWS_ENABLED');
optionalInteger('COMPETITION_NEWS_DISPLAY', { min: 1, max: 20 });
optionalInteger('COMPETITION_NEWS_MAX_ITEMS', { min: 1, max: 100 });
optionalInteger('COMPETITION_NEWS_PAUSE_MS', { min: 0, max: 5000 });
optionalBoolean('COMPETITION_GEMINI_PARSE_AMBIGUOUS');
optionalBoolean('FRED_FETCH_ENABLED');
optionalInteger('FRED_MAX_OBSERVATIONS', { min: 2, max: 120 });
optionalBoolean('GEMINI_REPORTS_ENABLED');
optionalBoolean('GEMINI_BRIEFINGS_ENABLED');
optionalInteger('GEMINI_BRIEFINGS_MAX_CALLS', { min: 0, max: 20 });
optionalBoolean('GEMINI_BRIEFINGS_INCLUDE_ALL');
optionalBoolean('GEMINI_COMPETITION_ENABLED');
optionalInteger('GEMINI_REQUEST_PAUSE_MS', { min: 5000, max: 60000 });
optionalInteger('GEMINI_MAX_INPUT_CHARS', { min: 4000, max: 60000 });
optionalInteger('GEMINI_MAX_RETRIES', { min: 0, max: 4 });
optionalInteger('GEMINI_COMPETITION_MAX_CALLS', { min: 0, max: 20 });
optionalBoolean('GEMINI_COMPETITION_ONLY_WHEN_REGEX');
const minConfidence = valueOf('GEMINI_COMPETITION_MIN_REGEX_CONFIDENCE');
if (minConfidence && !['low', 'medium'].includes(minConfidence)) errors.push('GEMINI_COMPETITION_MIN_REGEX_CONFIDENCE: low 또는 medium만 허용됩니다.');
optionalGeminiModel();

if (!valueOf('DART_API_KEY')) warnings.push('DART 인증 정보가 설정되지 않으면 Actions는 수집을 건너뛰고 데이터 연결 확인 화면으로 배포합니다.');
const hasNewsId = Boolean(valueOf('NEWS_CLIENT_ID'));
const hasNewsSecret = Boolean(valueOf('NEWS_CLIENT_SECRET'));
if (hasNewsId !== hasNewsSecret) errors.push('NEWS_CLIENT_ID와 NEWS_CLIENT_SECRET은 함께 설정해야 합니다.');
if (!hasNewsId && !hasNewsSecret) warnings.push('뉴스 연동 정보가 설정되지 않으면 뉴스 탭은 기본 표시 데이터로 배포됩니다.');

const competitionEnabled = valueOf('COMPETITION_NEWS_ENABLED') ? truthy(valueOf('COMPETITION_NEWS_ENABLED')) : true;
if (competitionEnabled && hasNewsId !== hasNewsSecret) errors.push('경쟁률 뉴스 언급 수집도 NEWS_CLIENT_ID와 NEWS_CLIENT_SECRET이 함께 필요합니다.');
if (competitionEnabled && !hasNewsId && !hasNewsSecret) warnings.push('경쟁률 뉴스 언급 수집은 뉴스 검색 인증값이 없으면 기존 competition-mentions.json을 유지합니다.');

if (truthy(valueOf('GEMINI_REPORTS_ENABLED')) && !hasGeminiKey()) {
 errors.push('GEMINI_REPORTS_ENABLED=true이면 GEMINI_API_KEY 또는 GOOGLE_API_KEY가 필요합니다.');
}
if (truthy(valueOf('GEMINI_COMPETITION_ENABLED')) && !hasGeminiKey()) {
 errors.push('GEMINI_COMPETITION_ENABLED=true이면 GEMINI_API_KEY 또는 GOOGLE_API_KEY가 필요합니다.');
}
if (truthy(valueOf('GEMINI_BRIEFINGS_ENABLED')) && !hasGeminiKey()) {
 errors.push('GEMINI_BRIEFINGS_ENABLED=true이면 GEMINI_API_KEY 또는 GOOGLE_API_KEY가 필요합니다.');
}

if (!truthy(valueOf('GEMINI_COMPETITION_ENABLED'))) {
 warnings.push('경쟁률 Gemini 보조 파싱은 비활성화 상태입니다. Regex 후보만 사용합니다.');
}
if (!truthy(valueOf('GEMINI_BRIEFINGS_ENABLED'))) {
 warnings.push('회사별 브리핑 Gemini 생성은 비활성화 상태입니다. 로컬 규칙 브리핑을 사용합니다.');
}

const fredEnabled = truthy(valueOf('FRED_FETCH_ENABLED'));
const hasFred = Boolean(valueOf('FRED_API_KEY'));
if (fredEnabled && !hasFred) {
 errors.push('FRED_FETCH_ENABLED=true이면 FRED_API_KEY가 필요합니다.');
} else if (!hasFred) {
 warnings.push('FRED 연동 정보가 설정되지 않으면 시장환경은 기본 표시 데이터로 표시됩니다.');
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
