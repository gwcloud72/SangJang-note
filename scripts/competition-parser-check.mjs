import fs from 'node:fs';
import path from 'node:path';
import { parseCompetitionCandidates, scoreCandidate } from './competition-parser.mjs';
import { geminiCompetitionSettings, mergeCompetitionCandidates } from './lib/gemini-competition.mjs';

const samples = [
  ['스트라드비젼 청약 첫날 경쟁률 82.4대 1', 'total', 82.4],
  ['오후 2시 기준 비례경쟁률 436.8대 1 기록', 'proportional', 436.8],
  ['균등 배정 예상 1.23주', 'equalShares', 1.23],
];
const errors = [];
for (const [text, type, value] of samples) {
  const candidates = parseCompetitionCandidates(text);
  if (!candidates.some((item) => item.type === type && item.value === value)) errors.push(`parse failed: ${text}`);
}
const scored = scoreCandidate({ companyName: '스트라드비젼', title: '스트라드비젼 청약 경쟁률 82.4대 1', body: '공모주 첫날 기준', candidate: { type: 'total', value: 82.4 } });
if (scored !== 'medium') errors.push('score failed: expected medium');
const merged = mergeCompetitionCandidates([{ type: 'total', value: 82.4, confidence: 'low', raw: '경쟁률 82.4대 1' }], [{ type: 'total', value: 82.4, confidence: 'medium', raw: '중복' }, { type: 'proportional', value: 164.8, confidence: 'medium', raw: '비례 164.8대 1' }]);
if (merged.length !== 2 || !merged.some((item) => item.type === 'proportional' && item.value === 164.8)) errors.push('Gemini/regex 후보 병합 실패');
const settings = geminiCompetitionSettings();
if (settings.maxCalls < 0 || settings.maxCalls > 20) errors.push('Gemini 경쟁률 호출 상한은 0~20 범위여야 합니다.');

for (const file of ['public/data/competition-mentions.json', 'public/data/competition-snapshots.json']) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) { errors.push(`${file}: 파일 확인 필요`); continue; }
  try { JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (error) { errors.push(`${file}: JSON parse 실패 (${error.message})`); }
}

const sourceFiles = ['scripts/collect-ipo-competition-news.mjs', 'scripts/lib/gemini-competition.mjs', 'scripts/lib/gemini-flash.mjs'];
const source = sourceFiles.map((file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '').join('\n');
if (!source.includes('GEMINI_COMPETITION_ENABLED')) errors.push('Gemini 경쟁률 파싱은 GEMINI_COMPETITION_ENABLED로 명시 활성화되어야 합니다.');
if (!source.includes('GEMINI_COMPETITION_MAX_CALLS')) errors.push('Gemini 경쟁률 호출 수 상한이 필요합니다.');
if (!source.includes('previousByArticle')) errors.push('기사 캐시 기반 중복 호출 방지가 필요합니다.');
if (!source.includes('competition-gemini-cache.json')) errors.push('Gemini 결과 캐시가 필요합니다.');

if (errors.length) { console.error('competition:check failed'); errors.forEach((e) => console.error(`- ${e}`)); process.exit(1); }
console.log('competition:check passed');
