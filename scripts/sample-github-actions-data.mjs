import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DATA_DIR = path.resolve('public/data');
const REFERENCE_DATE = '2026-06-14';
const UPDATED_AT = '2026-06-14T00:30:00.000Z';
const UPDATED_KST = '2026-06-14T09:30:00+09:00';
const DART_URL = 'https://dart.fss.or.kr/dsac008/main.do';

function item({ id, companyName, status, underwriter, date, endDate, sector, title }) {
  const compact = date.replaceAll('-', '');
  return {
    id,
    companyName,
    company: companyName,
    status,
    stage: status,
    leadManager: underwriter,
    underwriter,
    scheduleStart: date,
    scheduleEnd: endDate || date,
    subscriptionDate: status.includes('청약') ? date : '',
    subscriptionStart: status.includes('청약') ? date : '',
    subscriptionEnd: status.includes('청약') ? (endDate || date) : '',
    refundDate: '',
    listingDate: '',
    refundDateSource: '',
    listingDateSource: '',
    detailSource: '',
    detailSourceNote: '데모 데이터는 환불일·상장일을 임의로 채우지 않습니다. 실제 DART 원문 수집에서 추출된 값만 날짜로 표시합니다.',
    date,
    reportDate: date,
    receiptDate: date,
    rceptDt: compact,
    updatedAt: UPDATED_KST,
    reportName: title,
    title,
    dartUrl: DART_URL,
    url: DART_URL,
    link: DART_URL,
    sector,
    sourceMode: 'github-actions-demo',
    offeringCategory: 'ipo',
    eventType: 'initial_public_offering',
  };
}

const ipoItems = [
  item({ id: 'bigwave-robotics', companyName: '빅웨이브로보틱스', status: '예비심사', underwriter: '유진투자증권·미래에셋증권', date: '2026-06-16', sector: '로봇 플랫폼 기업', title: '예비심사 일정 확인' }),
  item({ id: 'stradvision', companyName: '스트라드비젼', status: '청약 예정', underwriter: 'KB증권', date: '2026-06-18', endDate: '2026-06-19', sector: '자율주행 인식 소프트웨어 기업', title: '공모 청약 예정 일정 확인' }),
  item({ id: 'justek', companyName: '져스텍', status: '청약 예정', underwriter: '삼성증권', date: '2026-06-18', endDate: '2026-06-19', sector: '초정밀 모션제어 장비 기업', title: '공모 청약 예정 일정 확인' }),
  item({ id: 'korea-spac16', companyName: '한국제16호스팩', status: '청약 예정', underwriter: '한국투자증권', date: '2026-06-22', endDate: '2026-06-23', sector: '스팩 IPO 기업', title: '스팩 청약 예정 일정 확인' }),
  item({ id: 'madup', companyName: '매드업', status: '예비심사', underwriter: '미래에셋증권', date: '2026-06-23', sector: 'AI 마케팅 솔루션 기업', title: '예비심사 일정 확인' }),
  item({ id: 'lemonhealthcare', companyName: '레몬헬스케어', status: '청약 예정', underwriter: 'KB증권', date: '2026-06-24', endDate: '2026-06-25', sector: '헬스케어 플랫폼 기업', title: '공모 청약 예정 일정 확인' }),
];

const ipos = {
  metadata: { source: 'github-actions-demo:ipo-calendar', sourceMode: 'github-actions-demo', updatedAt: UPDATED_AT, updatedKst: UPDATED_KST, generatedAt: UPDATED_AT, referenceDate: REFERENCE_DATE, itemCount: ipoItems.length, officialSource: 'DART 수집 구조 데모', policy: '청약 경쟁률은 청약 진행일에만 표시합니다. 환불일·상장일은 DART 원문에서 추출된 값만 날짜로 표시하고 데모에서는 임의로 채우지 않습니다.' },
  items: ipoItems,
};

const newsItems = [
  ['news-bigwave', '빅웨이브로보틱스', '빅웨이브로보틱스 예비심사 일정 확인', '로봇 플랫폼 기업 예비심사 일정과 주관사를 함께 봅니다.', '2026-06-14T00:10:00.000Z'],
  ['news-strad', '스트라드비젼', '스트라드비젼 청약 일정 사전 점검', '자율주행 인식 소프트웨어 기업 청약 예정 일정 기사입니다.', '2026-06-14T00:20:00.000Z'],
  ['news-justek', '져스텍', '져스텍 청약 일정 사전 확인', '초정밀 모션제어 장비 기업의 청약 일정을 확인합니다.', '2026-06-14T00:28:00.000Z'],
  ['news-spac16', '한국제16호스팩', '한국제16호스팩 청약 일정 확인', '스팩 공모 청약 일정과 주관사를 확인합니다.', '2026-06-14T00:30:00.000Z'],
  ['news-madup', '매드업', '매드업 예비심사 예정 일정 확인', 'AI 마케팅 솔루션 기업 예비심사 일정 기사입니다.', '2026-06-14T00:32:00.000Z'],
  ['news-lemon', '레몬헬스케어', '레몬헬스케어 청약 예정일 확인', '헬스케어 플랫폼 기업 청약 예정일을 확인합니다.', '2026-06-14T00:40:00.000Z'],
].map(([id, companyName, title, summary, publishedAt]) => ({ id, companyName, company: companyName, keyword: companyName, title, provider: '뉴스 검색', source: '뉴스 검색', publishedAt, date: publishedAt, link: DART_URL, originallink: DART_URL, summary }));

const news = { metadata: { source: 'github-actions-demo:naver-news-search', sourceMode: 'github-actions-demo', updatedAt: UPDATED_AT, updatedKst: UPDATED_KST, itemCount: newsItems.length, queryCount: newsItems.length, notice: '청약 전 경쟁률 기사 후보는 저장하지 않습니다.' }, items: newsItems };

const competitionSnapshots = { metadata: { source: 'manual-confirmed', sourceMode: 'github-actions-demo', displayLabel: '확인 입력', updatedAt: UPDATED_AT, updatedKst: UPDATED_KST, activeIpoCount: 0, policy: '06.14 기준 청약 진행 기업이 없어 확인 입력 경쟁률을 표시하지 않습니다.' }, items: [] };
const competitionMentions = { metadata: { source: 'github-actions-demo:naver-news-gemini', sourceMode: 'github-actions-demo', displayLabel: '뉴스 언급', updatedAt: UPDATED_AT, updatedKst: UPDATED_KST, activeIpoCount: 0, policy: '청약 진행일에만 경쟁률 뉴스 언급을 저장합니다.' }, items: [] };
const geminiCache = { metadata: { source: 'github-actions-demo:gemini-competition-cache', updatedAt: UPDATED_AT, policy: '동일 기사 재호출 방지용 데모 캐시입니다.' }, items: [] };
const briefingCache = { metadata: { source: 'github-actions-demo:gemini-briefing-cache', updatedAt: UPDATED_AT }, items: [] };

const report = { metadata: { generatedAt: UPDATED_AT, updatedKst: UPDATED_KST, source: 'github-actions-demo:gemini-summary', model: 'local-rules-demo', scope: 'github-pages-v1', referenceDate: REFERENCE_DATE }, lines: ['06.14 기준 청약 진행 기업은 없습니다.', '청약 경쟁률은 청약 시작일 이후 확인 입력 또는 뉴스 언급이 있을 때만 표시합니다.', '예정 기업은 원문 일정과 주관사 공지부터 확인합니다.'] };
const fredMacro = { metadata: { source: 'github-actions-demo:fred', sourceMode: 'github-actions-demo', updatedAt: UPDATED_KST, generatedAt: UPDATED_AT, seriesCount: 4, note: '최근 저장 기준 시장환경 데모입니다.' }, items: [
  { seriesId: 'FEDFUNDS', koreanName: '미국 기준금리', unit: '%', latestDate: '2026-06-13', latestValue: 3.62, previousDate: '2026-06-12', previousValue: 3.62, change: 0, changeRate: 0, observations: [{ date: '2026-06-09', value: 3.62 }, { date: '2026-06-10', value: 3.62 }, { date: '2026-06-11', value: 3.62 }, { date: '2026-06-12', value: 3.62 }, { date: '2026-06-13', value: 3.62 }] },
  { seriesId: 'DGS10', koreanName: '미국 10년 국채금리', unit: '%', latestDate: '2026-06-13', latestValue: 4.55, previousDate: '2026-06-12', previousValue: 4.53, change: 0.02, changeRate: 0.44, observations: [{ date: '2026-06-09', value: 4.51 }, { date: '2026-06-10', value: 4.52 }, { date: '2026-06-11', value: 4.53 }, { date: '2026-06-12', value: 4.53 }, { date: '2026-06-13', value: 4.55 }] },
  { seriesId: 'CPIAUCSL', koreanName: '미국 소비자물가지수', unit: 'pt', latestDate: '2026-06-13', latestValue: 334.118, previousDate: '2026-06-12', previousValue: 334.002, change: 0.116, changeRate: 0.03, observations: [{ date: '2026-06-09', value: 333.912 }, { date: '2026-06-10', value: 333.984 }, { date: '2026-06-11', value: 334.006 }, { date: '2026-06-12', value: 334.002 }, { date: '2026-06-13', value: 334.118 }] },
  { seriesId: 'UNRATE', koreanName: '미국 실업률', unit: '%', latestDate: '2026-06-13', latestValue: 4.2, previousDate: '2026-06-12', previousValue: 4.2, change: 0, changeRate: 0, observations: [{ date: '2026-06-09', value: 4.2 }, { date: '2026-06-10', value: 4.2 }, { date: '2026-06-11', value: 4.2 }, { date: '2026-06-12', value: 4.2 }, { date: '2026-06-13', value: 4.2 }] },
] };
const fredMacroReport = { metadata: { source: 'github-actions-demo:fred-summary', generatedAt: UPDATED_AT, updatedKst: UPDATED_KST, itemCount: 4 }, items: [
  { seriesId: 'FEDFUNDS', koreanName: '미국 기준금리', plainSummary: '기준금리는 06.13 기준 3.62%로 표시됩니다.', ipoContext: '공모 일정 확인 시 자금시장 분위기를 함께 보는 참고 지표입니다.', caution: '공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId: 'DGS10', koreanName: '미국 10년 국채금리', plainSummary: '10년 국채금리는 06.13 기준 4.55%로 표시됩니다.', ipoContext: '장기금리 흐름은 성장기업 평가 환경을 볼 때 참고할 수 있습니다.', caution: '공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId: 'CPIAUCSL', koreanName: '미국 소비자물가지수', plainSummary: '소비자물가지수는 06.13 기준 334.118로 표시됩니다.', ipoContext: '물가 흐름은 시장환경 확인용 보조 지표입니다.', caution: '공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId: 'UNRATE', koreanName: '미국 실업률', plainSummary: '실업률은 06.13 기준 4.2%로 표시됩니다.', ipoContext: '고용 지표는 시장 심리 확인용 보조 지표입니다.', caution: '공시 원문과 일정 정보를 함께 확인하세요.' },
] };

async function writeJson(fileName, payload) { await writeFile(path.join(DATA_DIR, fileName), `${JSON.stringify(payload, null, 2)}\n`, 'utf8'); }
async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeJson('ipos.json', ipos);
  await writeJson('news.json', news);
  await writeJson('competition-snapshots.json', competitionSnapshots);
  await writeJson('competition-mentions.json', competitionMentions);
  await writeJson('competition-gemini-cache.json', geminiCache);
  await writeJson('ipo-ai-report.json', report);
  await writeJson('fred-macro.json', fredMacro);
  await writeJson('fred-macro-report.json', fredMacroReport);
  await writeJson('ipo-briefings-gemini-cache.json', briefingCache);
  await execFileAsync(process.execPath, ['scripts/generate-ipo-briefings.mjs'], { env: { ...process.env, GEMINI_BRIEFINGS_ENABLED: 'false' } });
  const briefingPayload = JSON.parse(await readFile(path.join(DATA_DIR, 'ipo-briefings.json'), 'utf8'));
  briefingPayload.metadata = { ...briefingPayload.metadata, source: 'github-actions-demo:ipo-briefings', sourceMode: 'github-actions-demo', generatedAt: UPDATED_AT, updatedKst: UPDATED_KST, model: briefingPayload.metadata.model || 'local-rules-demo' };
  briefingPayload.items = briefingPayload.items.map((row) => ({ ...row, generatedBy: row.generatedBy === 'local-rules' ? 'github-actions-local-rules' : row.generatedBy, competition: null }));
  await writeJson('ipo-briefings.json', briefingPayload);
  await writeJson('ipo-briefings-gemini-cache.json', briefingCache);
  console.log('GitHub Actions demo data written to public/data/*.json');
}

main().catch((error) => { console.error(error); process.exit(1); });
