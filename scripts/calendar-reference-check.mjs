import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const errors = [];
const fixtureIpos = {
  metadata: { referenceDate: '2026-06-15', updatedAt: '2026-06-15T00:30:00.000Z', source: 'calendar-regression-fixture' },
  items: [
    { id: 'old-may', companyName: '오월과거', status: '청약 예정', stage: '청약 예정', date: '05.22', scheduleStart: '05.22', scheduleEnd: '05.22', leadManager: '테스트증권', underwriter: '테스트증권', offeringCategory: 'ipo', eventType: 'initial_public_offering' },
    { id: 'future-june', companyName: '유월미래', status: '청약 예정', stage: '청약 예정', date: '06.18', subscriptionDate: '06.18', subscriptionStart: '06.18', subscriptionEnd: '06.19', scheduleStart: '06.18', scheduleEnd: '06.19', leadManager: '테스트증권', underwriter: '테스트증권', offeringCategory: 'ipo', eventType: 'initial_public_offering' },
  ],
};

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const dataMod = await vite.ssrLoadModule('/src/data/normalize.ts');
  const uiMod = await vite.ssrLoadModule('/src/components/feature/sang.tsx');
  const data = dataMod.buildSangData(fixtureIpos, null, null, null, null, null, null, null);

  if (data.referenceDate !== '2026-06-15') errors.push(`기준일 보존 실패: ${data.referenceDate}`);
  if (data.companies.some((company) => company.name === '오월과거')) errors.push('지난 5월 MM.DD 일정이 기업 목록에 남아 있습니다.');
  const future = data.companies.find((company) => company.name === '유월미래');
  if (!future) errors.push('6월 예정 일정이 누락되었습니다.');
  if (future && future.subscriptionStart !== '2026-06-18') errors.push(`MM.DD 일정 정규화 실패: ${future.subscriptionStart}`);

  const html = ReactDOMServer.renderToString(React.createElement(uiMod.IPOCalendar, { companies: data.companies, referenceDate: data.referenceDate, onSelect() {} }));
  const compactHtml = html.replace(/<!-- -->/g, '').replace(/\s+/g, '');
  if (!compactHtml.includes('2026년6월')) errors.push('캘린더가 기준일의 6월을 표시하지 않습니다.');
  if (compactHtml.includes('2026년5월')) errors.push('캘린더가 첫 번째 과거 일정의 5월에 고정되었습니다.');

  const staleMetadata = { ...fixtureIpos, metadata: { ...fixtureIpos.metadata, referenceDate: '2026-05-22' } };
  const staleData = dataMod.buildSangData(staleMetadata, null, null, null, null, null, null, null);
  if (staleData.referenceDate.startsWith('2026-05')) errors.push(`오래된 metadata.referenceDate가 현재 기준일로 보정되지 않았습니다: ${staleData.referenceDate}`);
  const staleHtml = ReactDOMServer.renderToString(React.createElement(uiMod.IPOCalendar, { companies: staleData.companies, referenceDate: staleData.referenceDate, onSelect() {} }));
  const compactStaleHtml = staleHtml.replace(/<!-- -->/g, '').replace(/\s+/g, '');
  if (compactStaleHtml.includes('2026년5월')) errors.push('오래된 metadata.referenceDate 때문에 캘린더가 5월에 고정되었습니다.');
} finally {
  await vite.close();
}

if (errors.length) {
  console.error('calendar:check failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('calendar:check passed');
