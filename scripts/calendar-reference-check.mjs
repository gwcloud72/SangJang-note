import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

function pad2(value) { return String(value).padStart(2, '0'); }
function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function addDaysIso(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
function mmdd(isoDate) { return isoDate.slice(5).replace('-', '.'); }
function calendarMonthLabel(isoDate) {
  const [year, month] = isoDate.split('-').map(Number);
  return `${year}년${month}월`;
}

const errors = [];
const today = kstDateString();
const pastDate = addDaysIso(today, -25);
const futureStartDate = addDaysIso(today, 2);
const futureEndDate = addDaysIso(today, 3);
const expectedMonthLabel = calendarMonthLabel(today);
const pastMonthLabel = calendarMonthLabel(pastDate);

const fixtureIpos = {
  metadata: { referenceDate: pastDate, updatedAt: `${pastDate}T00:30:00.000Z`, source: 'calendar-regression-fixture' },
  items: [
    { id: 'past-item', companyName: '과거일정', status: '청약 예정', stage: '청약 예정', date: mmdd(pastDate), scheduleStart: mmdd(pastDate), scheduleEnd: mmdd(pastDate), leadManager: '테스트증권', underwriter: '테스트증권', offeringCategory: 'ipo', eventType: 'initial_public_offering' },
    { id: 'future-item', companyName: '미래일정', status: '청약 예정', stage: '청약 예정', date: mmdd(futureStartDate), subscriptionDate: mmdd(futureStartDate), subscriptionStart: mmdd(futureStartDate), subscriptionEnd: mmdd(futureEndDate), scheduleStart: mmdd(futureStartDate), scheduleEnd: mmdd(futureEndDate), leadManager: '테스트증권', underwriter: '테스트증권', offeringCategory: 'ipo', eventType: 'initial_public_offering' },
  ],
};

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const dataMod = await vite.ssrLoadModule('/src/data/normalize.ts');
  const uiMod = await vite.ssrLoadModule('/src/components/feature/sang.tsx');
  const data = dataMod.buildSangData(fixtureIpos, null, null, null, null, null, null, null);

  if (data.referenceDate !== today) errors.push(`오늘 기준일 적용 실패: ${data.referenceDate} !== ${today}`);
  if (data.companies.some((company) => company.name === '과거일정')) errors.push('지난 일정이 기업 목록에 남아 있습니다.');
  const future = data.companies.find((company) => company.name === '미래일정');
  if (!future) errors.push('예정 일정이 누락되었습니다.');
  if (future && future.subscriptionStart !== futureStartDate) errors.push(`MM.DD 일정 정규화 실패: ${future.subscriptionStart} !== ${futureStartDate}`);

  const html = ReactDOMServer.renderToString(React.createElement(uiMod.IPOCalendar, { companies: data.companies, referenceDate: data.referenceDate, onSelect() {} }));
  const compactHtml = html.replace(/<!-- -->/g, '').replace(/\s+/g, '');
  if (!compactHtml.includes(expectedMonthLabel)) errors.push(`캘린더가 오늘 기준 월을 표시하지 않습니다: ${expectedMonthLabel}`);
  if (pastMonthLabel !== expectedMonthLabel && compactHtml.includes(pastMonthLabel)) errors.push('캘린더가 과거 일정 월에 고정되었습니다.');
} finally {
  await vite.close();
}

if (errors.length) {
  console.error('calendar:check failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('calendar:check passed');
