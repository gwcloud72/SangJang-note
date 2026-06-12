import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

const tabs = ["home", "watch", "companies", "filings", "calendar", "timeline", "news", "market", "reports", "ai", "alerts", "favorites", "memo", "settings"];
const expectedText = {"home": "IPO 일정과 공시를 한곳에", "watch": "관심기업", "companies": "기업 목록", "filings": "공시 검색", "calendar": "일정 캘린더", "timeline": "타임라인", "news": "뉴스", "market": "시장환경", "reports": "리포트", "ai": "공시 요약", "alerts": "청약 마감 알림", "favorites": "즐겨찾기", "memo": "메모", "settings": "출처"};
const errors = [];
global.window = { location: { hash: '' }, history: { replaceState(_state, _title, url) { global.window.location.hash = String(url || '').replace(new RegExp('^[^#]*'), ''); } }, addEventListener() {}, removeEventListener() {}, setTimeout(callback) { callback(); return 0; }, clearTimeout() {} };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'SSR' }, configurable: true });

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const mod = await vite.ssrLoadModule('/src/App.tsx');
  for (const tab of tabs) {
    try {
      global.window.location.hash = tab === 'home' ? '' : `#${tab}`;
      const html = ReactDOMServer.renderToString(React.createElement(mod.default));
      if (!html.includes('id="main-content"')) errors.push(`${tab}: main-content 렌더링 누락`);
      if (!html.includes('href="#main-content"')) errors.push(`${tab}: 본문 바로가기 렌더링 누락`);
      if (html.includes('undefined') || html.includes('NaN')) errors.push(`${tab}: undefined 또는 NaN 출력 확인`);
      const text = expectedText[tab];
      const candidates = Array.isArray(text) ? text : [text];
      const hasExpectedText = candidates.length === 0 || candidates.some((item) => html.includes(item));
      const hasPendingState = html.includes('IPO·공시 데이터');
      if (!hasExpectedText && !hasPendingState) errors.push(`${tab}: 전용 화면 또는 데이터 대기 문구 누락 - ${candidates.join(' | ')}`);
    } catch (error) {
      errors.push(`${tab}: SSR 렌더링 실패 - ${error.message}`);
    }
  }
} finally {
  await vite.close();
}

if (errors.length) {
  console.error('render:check failed');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('render:check passed');
console.log(`Rendered tabs: ${tabs.length}`);
