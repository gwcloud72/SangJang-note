import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const tabs = ['home', 'companies', 'calendar', 'ai', 'news'];
const labels = { home: '오늘', companies: '기업', calendar: '일정', ai: '원문 일정', news: 'IPO 이슈' };
const outDir = path.resolve('../screenshots-static-html');
const dataDir = path.resolve('public/data');
async function readJson(file) { return JSON.parse(await readFile(path.join(dataDir, file), 'utf8')); }
function formatActionStamp(value) {
  if (!value) return '오늘 09:30 기준';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace('T',' ').replace('+09:00','').slice(5,16) + ' 기준';
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')} 기준`;
}
function findBuiltCss() {
  return import('node:fs').then(({ readdirSync }) => {
    const assets = readdirSync('dist/assets');
    const css = assets.find((file) => file.endsWith('.css'));
    if (!css) throw new Error('built css not found');
    return path.resolve('dist/assets', css);
  });
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  await mkdir(outDir, { recursive: true });
  const [ipoJson, newsJson, reportJson, fredJson, fredReportJson, mentionJson, snapshotJson, briefingJson] = await Promise.all([
    readJson('ipos.json'),
    readJson('news.json'),
    readJson('ipo-ai-report.json'),
    readJson('fred-macro.json'),
    readJson('fred-macro-report.json'),
    readJson('competition-mentions.json'),
    readJson('competition-snapshots.json'),
    readJson('ipo-briefings.json'),
  ]);
  const [{ AppLayout }, { NAV_ITEMS }, normalize, { HomePage }, tabsMod] = await Promise.all([
    vite.ssrLoadModule('/src/components/layout/AppLayout.tsx'),
    vite.ssrLoadModule('/src/data/navigation.ts'),
    vite.ssrLoadModule('/src/data/normalize.ts'),
    vite.ssrLoadModule('/src/pages/HomePage.tsx'),
    vite.ssrLoadModule('/src/pages/tabs/SangTabs.tsx'),
  ]);
  const data = normalize.buildSangData(ipoJson, newsJson, reportJson, fredJson, fredReportJson, mentionJson, snapshotJson, briefingJson);
  const cssPath = await findBuiltCss();
  const css = await readFile(cssPath, 'utf8');
  const liveText = formatActionStamp(data.actionUpdatedAt);
  const panels = { home: HomePage, companies: tabsMod.CompaniesPage, calendar: tabsMod.CalendarPage, ai: tabsMod.AiPage, news: tabsMod.NewsPage };
  for (const tab of tabs) {
    const Panel = panels[tab];
    const body = ReactDOMServer.renderToString(
      React.createElement(AppLayout, {
        kind: 'gnb',
        appName: '상장노트',
        source: '최근 저장 기준',
        tab,
        navItems: NAV_ITEMS,
        onTabChange: () => undefined,
        onRefresh: () => undefined,
        refreshing: false,
        liveText,
      }, React.createElement(Panel, {
        data,
        onTabChange: () => undefined,
        onAction: () => undefined,
        watchCompanyIds: [],
        savedFilingIds: [],
        onWatchToggle: () => undefined,
        onFilingSave: () => undefined,
      }))
    );
    const captureCss = `
      body {
        margin: 0;
        background: #f7f8fb;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .v6-block,
      .v6-action-row {
        opacity: 1;
        transform: none;
      }
      main {
        display: block;
        max-width: 1280px;
        margin: 24px auto;
        padding: 0;
      }
      main > section,
      .v6-page {
        display: block;
        width: 100%;
        max-width: 1280px;
      }
    `;
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>상장노트 ${labels[tab]}</title><style>${css}</style><style>${captureCss}</style></head><body>${body}</body></html>`;
    await writeFile(path.join(outDir, `sang_v12_${tab}.html`), html, 'utf8');
  }
  console.log(`static screenshot html written: ${outDir}`);
} finally {
  await vite.close();
}
