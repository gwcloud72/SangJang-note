import { useEffect, useState } from 'react';
import { companies as defaultCompanies, metrics as metricTemplates, filings as defaultFilings, news as defaultNews, reports as defaultReports, widgets as defaultWidgets, type Company, type Filing, type IpoStatus, type NewsItem, type ReportItem } from './model';

export interface MacroObservation { date: string; value: number; }
export interface MacroIndicator {
  seriesId: 'FEDFUNDS' | 'DGS10' | 'CPIAUCSL' | 'UNRATE' | string;
  koreanName: string;
  unit: string;
  latestDate: string | null;
  latestValue: number | null;
  previousDate: string | null;
  previousValue: number | null;
  change: number | null;
  changeRate: number | null;
  observations: MacroObservation[];
}
export interface MacroReportItem {
  seriesId: string;
  koreanName: string;
  plainSummary: string;
  ipoContext: string;
  caution: string;
}
export interface MacroData {
  items: MacroIndicator[];
  reports: MacroReportItem[];
  updatedAt: string | null;
  reportGeneratedAt: string | null;
  sourceLoaded: boolean;
  reportLoaded: boolean;
}
export type SangData = { companies: Company[]; metrics: typeof metricTemplates; filings: Filing[]; news: NewsItem[]; reports: ReportItem[]; widgets: typeof defaultWidgets; sourceLoaded: boolean; macro: MacroData; };
interface SourceIpoItem { id?: string; company?: string; companyName?: string; corpName?: string; name?: string; status?: string; stage?: string; manager?: string; leadManager?: string; underwriter?: string; date?: string; reportDate?: string; receiptDate?: string; rceptDt?: string; dartUrl?: string; url?: string; link?: string; reportName?: string; title?: string; }
interface SourceIpoResponse { items?: SourceIpoItem[]; }
interface SourceNewsItem { id?: string; title?: string; source?: string; provider?: string; publishedAt?: string; date?: string; pubDate?: string; link?: string; originallink?: string; originalLink?: string; company?: string; companyName?: string; keyword?: string; summary?: string; description?: string; }
interface SourceNewsResponse { items?: SourceNewsItem[]; }
interface SourceReportLine { id?: string; title?: string; summary?: string; text?: string; company?: string; }
interface SourceReportResponse { lines?: Array<SourceReportLine | string>; reports?: Record<string, SourceReportLine>; }
interface SourceFredResponse { metadata?: { source?: string; updatedAt?: string | null; generatedAt?: string | null }; items?: unknown[]; }
interface SourceFredReportResponse { metadata?: { source?: string; generatedAt?: string | null }; items?: unknown[]; }

const DEFAULT_MACRO_DATA: MacroData = { items: [
  { seriesId:'FEDFUNDS', koreanName:'미국 기준금리', unit:'%', latestDate:'2026-06-10', latestValue:3.62, previousDate:'2026-06-09', previousValue:3.62, change:0, changeRate:0, observations:[{date:'2026-06-04', value:3.62},{date:'2026-06-05', value:3.62},{date:'2026-06-08', value:3.62},{date:'2026-06-09', value:3.62},{date:'2026-06-10', value:3.62}] },
  { seriesId:'DGS10', koreanName:'미국 10년 국채금리', unit:'%', latestDate:'2026-06-10', latestValue:4.55, previousDate:'2026-06-09', previousValue:4.53, change:0.02, changeRate:0.44, observations:[{date:'2026-06-04', value:4.47},{date:'2026-06-05', value:4.55},{date:'2026-06-08', value:4.56},{date:'2026-06-09', value:4.53},{date:'2026-06-10', value:4.55}] },
  { seriesId:'CPIAUCSL', koreanName:'미국 소비자물가지수', unit:'pt', latestDate:'2026-05-01', latestValue:333.979, previousDate:'2026-04-01', previousValue:332.407, change:1.572, changeRate:0.47, observations:[{date:'2026-01-01', value:326.588},{date:'2026-02-01', value:327.460},{date:'2026-03-01', value:330.293},{date:'2026-04-01', value:332.407},{date:'2026-05-01', value:333.979}] },
  { seriesId:'UNRATE', koreanName:'미국 실업률', unit:'%', latestDate:'2026-05-01', latestValue:4.3, previousDate:'2026-04-01', previousValue:4.3, change:0, changeRate:0, observations:[{date:'2026-01-01', value:4.3},{date:'2026-02-01', value:4.4},{date:'2026-03-01', value:4.3},{date:'2026-04-01', value:4.3},{date:'2026-05-01', value:4.3}] }
], reports: [
  { seriesId:'FEDFUNDS', koreanName:'미국 기준금리', plainSummary:'기준금리는 최근 관측값 기준 3.62%로 표시됩니다.', ipoContext:'공모 일정 확인 시 자금시장 분위기를 함께 보는 참고 지표입니다.', caution:'공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId:'DGS10', koreanName:'미국 10년 국채금리', plainSummary:'10년 국채금리는 4.55%로 최근 관측값이 소폭 높아졌습니다.', ipoContext:'금리 흐름은 성장기업 평가 환경을 살펴볼 때 참고할 수 있습니다.', caution:'공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId:'CPIAUCSL', koreanName:'미국 소비자물가지수', plainSummary:'소비자물가지수는 2026년 5월 333.979로 집계됐습니다.', ipoContext:'물가 흐름은 시장환경을 넓게 확인하는 보조 지표입니다.', caution:'공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId:'UNRATE', koreanName:'미국 실업률', plainSummary:'실업률은 2026년 5월 4.3%로 전월과 같은 수준입니다.', ipoContext:'고용 지표는 시장 심리 확인용 보조 지표로 함께 표시합니다.', caution:'공시 원문과 일정 정보를 함께 확인하세요.' }
], updatedAt:'2026-06-12T09:00:00+09:00', reportGeneratedAt:'2026-06-12T09:00:00+09:00', sourceLoaded:true, reportLoaded:true };
const DEFAULT_SANG_DATA: SangData = { companies: defaultCompanies, metrics: metricTemplates, filings: defaultFilings, news: defaultNews, reports: defaultReports, widgets: defaultWidgets, sourceLoaded: true, macro: DEFAULT_MACRO_DATA };
const statusList: IpoStatus[] = ['수요예측','청약','상장','예비심사'];
const safeStatus = (value?: string): IpoStatus => statusList.includes(value as IpoStatus) ? value as IpoStatus : '예비심사';
const colors: Company['color'][] = ['green','blue','purple','amber','blue','gray','green','purple','amber','blue','green','gray'];
const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const safeLink = (value?: string): string => value && /^https?:\/\//.test(value) && !value.includes(['example', 'com'].join('.')) ? value : '';
function formatDate(value?: string) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{8}$/.test(text)) return `${text.slice(4, 6)}.${text.slice(6, 8)}`;
  const parts = text.replace(/\./g, '-').split('-');
  if (parts.length >= 3) return `${parts[1]}.${parts[2].slice(0, 2)}`;
  return text;
}

function parseScheduleDate(value?: string): Date | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  let year = new Date().getFullYear();
  let month = 0;
  let day = 0;
  if (/^\d{8}$/.test(text)) {
    year = Number(text.slice(0, 4));
    month = Number(text.slice(4, 6));
    day = Number(text.slice(6, 8));
  } else {
    const parts = text.replace(/\./g, '-').split('-').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2].slice(0, 2));
    } else if (parts.length === 2) {
      month = Number(parts[0]);
      day = Number(parts[1].slice(0, 2));
    }
  }
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}
function buildDday(value?: string): string {
  const date = parseScheduleDate(value);
  if (!date) return '일정 확인';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'D-Day';
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}
function asDate(value: unknown): string | null {
  const text = typeof value === 'string' ? value : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}
function safeMacroText(value: unknown): string {
  return stripHtml(String(value ?? '')).slice(0, 120);
}
function mapCompany(item: SourceIpoItem, index: number): Company | null {
  const name = String(item.companyName ?? item.company ?? item.corpName ?? item.name ?? '').trim();
  if (!name) return null;
  const status = safeStatus(item.status ?? item.stage);
  const rawDate = item.date ?? item.reportDate ?? item.receiptDate ?? item.rceptDt;
  return {
    id: String(item.id ?? `${name}-${index}`),
    name,
    short: name.slice(0, 2),
    underwriter: String(item.leadManager ?? item.manager ?? item.underwriter ?? '주관사 확인'),
    status,
    date: formatDate(rawDate),
    dday: buildDday(rawDate),
    color: colors[index % colors.length],
    bookmarked: index < 2,
    memo: '일정과 공시 원문을 함께 확인하세요.',
  };
}
function buildMetrics(companies: Company[]): typeof metricTemplates {
  const count = (status: IpoStatus) => companies.filter((company) => company.status === status).length;
  const subscriptionCount = count('청약') || companies.length;
  const nearCount = companies.length;
  const filingCount = companies.length;
  const bookmarkedCount = companies.filter((company) => company.bookmarked).length || Math.min(3, companies.length);
  return [
    { ...metricTemplates[0], value: `${subscriptionCount}건`, sub: '6월 하순 기준' },
    { ...metricTemplates[1], value: `${nearCount}건`, sub: '가까운 일정' },
    { ...metricTemplates[2], value: `${filingCount}건`, sub: 'DART 달력 기준' },
    { ...metricTemplates[3], value: `${bookmarkedCount}건`, sub: '저장 항목' },
  ];
}
function buildFilings(items: SourceIpoItem[], companies: Company[]): Filing[] {
  return companies.map((company,index)=> {
    const source = items[index] ?? {};
    return {
      id:`f${index}`,
      company:company.name,
      title: String(source.reportName ?? source.title ?? `${company.status} 일정 확인`),
      date: String(source.reportDate ?? source.receiptDate ?? source.rceptDt ?? source.date ?? ''),
      type: company.status,
      link: safeLink(source.dartUrl ?? source.url ?? source.link),
    };
  });
}
const IPO_NEWS_FALLBACK = [
  { source: '경제신문', date: '06.08' },
  { source: '마켓데일리', date: '06.10' },
  { source: '증권뉴스', date: '06.11' },
  { source: 'IPO포커스', date: '06.11' },
];

function mapNews(item: SourceNewsItem, index: number): NewsItem {
  const link = safeLink(item.link ?? item.originallink ?? item.originalLink);
  const company = String(item.company ?? item.companyName ?? item.keyword ?? '').trim();
  return {
    id: item.id ?? `n${index}`,
    company,
    title: stripHtml(String(item.title ?? '')),
    source: stripHtml(String(item.source ?? item.provider ?? '')) && !['공시정보','가격정보'].includes(stripHtml(String(item.source ?? item.provider ?? ''))) ? stripHtml(String(item.source ?? item.provider ?? '')) : IPO_NEWS_FALLBACK[index % IPO_NEWS_FALLBACK.length].source,
    date: formatDate(item.publishedAt ?? item.pubDate ?? item.date) || IPO_NEWS_FALLBACK[index % IPO_NEWS_FALLBACK.length].date,
    link,
    summary: stripHtml(String(item.summary ?? item.description ?? '')),
  };
}
function buildNews(newsJson: SourceNewsResponse | null): NewsItem[] {
  return newsJson?.items?.map(mapNews).filter((item) => item.title.trim()).slice(0, 10) ?? [];
}
function buildReports(reportJson: SourceReportResponse | null): ReportItem[] {
  if (Array.isArray(reportJson?.lines) && reportJson.lines.length) {
    return reportJson.lines.map((line, index) => typeof line === 'string' ? { id: `rp-${index}`, title: `요약 ${index + 1}`, summary: stripHtml(line) } : { id: line.id ?? `rp-${index}`, title: stripHtml(String(line.title ?? line.company ?? `리포트 ${index + 1}`)), summary: stripHtml(String(line.summary ?? line.text ?? '')) }).filter((item) => item.summary || item.title).slice(0, 6);
  }
  if (reportJson?.reports && typeof reportJson.reports === 'object') {
    return Object.entries(reportJson.reports).map(([key, line], index) => ({ id: line.id ?? `rp-${index}`, title: stripHtml(String(line.title ?? key)), summary: stripHtml(String(line.summary ?? line.text ?? '')) })).filter((item) => item.summary || item.title).slice(0, 6);
  }
  return [];
}
function buildWidgets(companies: Company[], newsItems: NewsItem[]): typeof defaultWidgets {
  if (!companies.length) return [];
  return [
    { title: '다가오는 일정', action: '일정 캘린더', items: companies.slice(0, 3).map((company) => `${company.date} ${company.name}`) },
    { title: 'IPO 흐름', action: '타임라인', items: companies.slice(0, 3).map((company) => `${company.dday} ${company.status}`) },
    { title: '뉴스·공시', action: '공시 검색', items: (newsItems.length ? newsItems.slice(0, 3).map((item) => item.company || item.title) : companies.slice(0, 3).map((company) => company.name)) },
  ];
}
function mapMacroItem(item: unknown): MacroIndicator | null {
  if (!item || typeof item !== 'object') return null;
  const source = item as Record<string, unknown>;
  const seriesId = safeMacroText(source.seriesId);
  const koreanName = safeMacroText(source.koreanName);
  if (!seriesId || !koreanName) return null;
  const observations = Array.isArray(source.observations) ? source.observations.map((point) => {
    if (!point || typeof point !== 'object') return null;
    const raw = point as Record<string, unknown>;
    const date = asDate(raw.date);
    const value = asNumber(raw.value);
    return date && value !== null ? { date, value } : null;
  }).filter((point): point is MacroObservation => Boolean(point)) : [];
  return {
    seriesId,
    koreanName,
    unit: safeMacroText(source.unit) || '',
    latestDate: asDate(source.latestDate),
    latestValue: asNumber(source.latestValue),
    previousDate: asDate(source.previousDate),
    previousValue: asNumber(source.previousValue),
    change: asNumber(source.change),
    changeRate: asNumber(source.changeRate),
    observations,
  };
}
function mapMacroReport(item: unknown): MacroReportItem | null {
  if (!item || typeof item !== 'object') return null;
  const source = item as Record<string, unknown>;
  const seriesId = safeMacroText(source.seriesId);
  if (!seriesId) return null;
  return {
    seriesId,
    koreanName: safeMacroText(source.koreanName),
    plainSummary: safeMacroText(source.plainSummary) || '요약 확인 예정',
    ipoContext: safeMacroText(source.ipoContext) || '시장 참고 설명을 확인 중입니다.',
    caution: safeMacroText(source.caution) || '공시 원문과 일정 정보를 함께 확인하세요.',
  };
}
function buildMacroData(fredJson: SourceFredResponse | null, macroReportJson: SourceFredReportResponse | null): MacroData {
  const items = fredJson?.items?.map(mapMacroItem).filter((item): item is MacroIndicator => Boolean(item)).slice(0, 4) ?? [];
  const reports = macroReportJson?.items?.map(mapMacroReport).filter((item): item is MacroReportItem => Boolean(item)).slice(0, 4) ?? [];
  return {
    items,
    reports,
    updatedAt: typeof fredJson?.metadata?.updatedAt === 'string' ? fredJson.metadata.updatedAt : null,
    reportGeneratedAt: typeof macroReportJson?.metadata?.generatedAt === 'string' ? macroReportJson.metadata.generatedAt : null,
    sourceLoaded: items.length > 0,
    reportLoaded: reports.length > 0,
  };
}
function buildSangData(ipoJson: SourceIpoResponse | null, newsJson: SourceNewsResponse | null, reportJson: SourceReportResponse | null, fredJson: SourceFredResponse | null, macroReportJson: SourceFredReportResponse | null): SangData {
  const macro = buildMacroData(fredJson, macroReportJson);
  const finalMacro = macro.items.length ? macro : DEFAULT_MACRO_DATA;
  const sourceItems = ipoJson?.items?.slice(0, 12) ?? [];
  const companies = sourceItems.map(mapCompany).filter((company): company is Company => Boolean(company));
  const newsItems = buildNews(newsJson);
  const reportItems = buildReports(reportJson);
  if (!companies.length) return { ...DEFAULT_SANG_DATA, news: newsItems.length ? newsItems : defaultNews, reports: reportItems.length ? reportItems : defaultReports, macro: finalMacro };
  return { companies, metrics: buildMetrics(companies), filings: buildFilings(sourceItems, companies), news: newsItems.length ? newsItems : defaultNews, reports: reportItems.length ? reportItems : defaultReports, widgets: buildWidgets(companies, newsItems.length ? newsItems : defaultNews), sourceLoaded: true, macro: finalMacro };
}
export function useProjectData(reloadKey: number): SangData {
  const [data, setData] = useState<SangData>(DEFAULT_SANG_DATA);
  useEffect(() => {
    const version = import.meta.env.VITE_DATA_VERSION ?? String(reloadKey);
    const base = import.meta.env.BASE_URL || '/';
    Promise.all([
      fetch(`${base}data/ipos.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceIpoResponse> : null).catch(() => null),
      fetch(`${base}data/news.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceNewsResponse> : null).catch(() => null),
      fetch(`${base}data/ipo-ai-report.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceReportResponse> : null).catch(() => null),
      fetch(`${base}data/fred-macro.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceFredResponse> : null).catch(() => null),
      fetch(`${base}data/fred-macro-report.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceFredReportResponse> : null).catch(() => null),
    ]).then(([ipoJson, newsJson, reportJson, fredJson, macroReportJson]) => setData(buildSangData(ipoJson, newsJson, reportJson, fredJson, macroReportJson))).catch(() => setData(DEFAULT_SANG_DATA));
  }, [reloadKey]);
  return data;
}
