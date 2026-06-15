import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

const files = [
 'scripts/lib/gemini-flash.mjs',
 'scripts/lib/gemini-competition.mjs',
 'scripts/generate-ai-report.mjs',
 'scripts/generate-ipo-briefings.mjs',
 'scripts/lib/gemini-briefings.mjs',
 'scripts/collect-ipo-competition-news.mjs',
 'scripts/fetchFredMacro.js',
].filter((file) => existsSync(file));
const text = files.map((file) => `${file}\n${readFileSync(file, 'utf8')}`).join('\n');
const errors = [];

if (!text.includes("gemini-2.5-flash")) errors.push('Gemini 기본 모델은 gemini-2.5-flash여야 합니다.');
if (/gemini-[^'"\s]*pro/i.test(text)) errors.push('Pro 모델 식별자가 코드에 남아 있습니다.');
if (!text.includes('MIN_PAUSE_MS = 5000')) errors.push('요청 간 최소 지연 5000ms 방어가 필요합니다.');
if (!text.includes('cropJson') || !text.includes('GEMINI_MAX_INPUT_CHARS')) errors.push('입력 크롭 방어가 필요합니다.');
if (!text.includes('GEMINI_REPORTS_ENABLED')) errors.push('Gemini 리포트 호출은 명시 활성화 변수로 보호되어야 합니다.');
if (!text.includes('GEMINI_BRIEFINGS_ENABLED')) errors.push('Gemini 회사별 브리핑 호출은 명시 활성화 변수로 보호되어야 합니다.');
if (!text.includes('GEMINI_BRIEFINGS_MAX_CALLS')) errors.push('Gemini 회사별 브리핑은 실행당 호출 상한이 필요합니다.');
if (!text.includes('ipo-briefings-gemini-cache.json')) errors.push('회사별 브리핑도 동일 입력 재호출 방지 캐시가 필요합니다.');
if (!text.includes('GEMINI_COMPETITION_ENABLED')) errors.push('Gemini 경쟁률 보조 파싱도 명시 활성화 변수로 보호되어야 합니다.');
if (!text.includes('GEMINI_COMPETITION_MAX_CALLS')) errors.push('Gemini 경쟁률 보조 파싱은 실행당 호출 상한이 필요합니다.');
if (!text.includes('competition-gemini-cache.json')) errors.push('동일 기사 재호출 방지 캐시가 필요합니다.');
if (!text.includes('onlyWhenRegex') && !text.includes('GEMINI_COMPETITION_ALLOW_NO_REGEX')) errors.push('Gemini는 regex 후보 기사 중심으로 제한해야 합니다.');
if (!text.includes('429')) errors.push('429 재시도 처리가 필요합니다.');

if (errors.length) {
 console.error('gemini:check failed');
 errors.forEach((error) => console.error(`- ${error}`));
 process.exit(1);
}
console.log('gemini:check passed');
