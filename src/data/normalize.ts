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
export interface CompetitionCandidate { type: 'total' | 'proportional' | 'equalShares' | 'unknown'; value: number; raw?: string; confidence: 'low' | 'medium' | 'verified'; }
export interface CompetitionMention { id: string; ipoId: string; companyName: string; displayLabel: '뉴스 언급'; title: string; articleText: string; publisher: string; publishedAt: string | null; articleTimeLabel: string; link: string; candidates: CompetitionCandidate[]; }
export interface CompetitionSnapshot { id: string; ipoId: string; companyName: string; underwriter: string; capturedAt: string; capturedKstTime: string; totalCompetition: number; proportionalCompetition: number | null; sourceLabel: '확인 입력' | '증권사 기준' | '제휴 기준'; sourceType: 'manual' | 'broker' | 'partner'; confidence: 'verified'; sourceUrl: string; }
export interface CompetitionData { snapshots: CompetitionSnapshot[]; mentions: CompetitionMention[]; updatedAt: string | null; sourceLoaded: boolean; }
export interface IpoBriefing { id: string; ipoId: string; companyName: string; sector: string; ipoStage: string; underwriter: string; basisTimeLabel: string; oneLine: string; body: string; points: string[]; sourceLabels: string[]; competition?: { label: string; value: number; proportionalValue: number | null; timeLabel: string; sourceLine: string } | null; generatedBy: string; model: string | null; }
export interface BriefingData { items: IpoBriefing[]; updatedAt: string | null; sourceLoaded: boolean; }
export type IpoAlertStage = '예비심사' | '수요예측' | '청약 예정' | '청약 진행중' | '환불일' | '상장';
export interface IpoAlert { id: string; companyId: string; companyName: string; stage: IpoAlertStage; date: string; dateLabel: string; actionLabel: string; detail: string; sourceLabel: string; }
export type SangData = { companies: Company[]; metrics: typeof metricTemplates; filings: Filing[]; news: NewsItem[]; reports: ReportItem[]; widgets: typeof defaultWidgets; sourceLoaded: boolean; macro: MacroData; competition: CompetitionData; briefings: BriefingData; alerts: IpoAlert[]; actionUpdatedAt: string | null; referenceDate: string; dataMode: 'actions' | 'fallback'; };
interface SourceIpoItem { id?: string; company?: string; companyName?: string; corpName?: string; name?: string; sector?: string; status?: string; stage?: string; manager?: string; leadManager?: string; underwriter?: string; date?: string; reportDate?: string; receiptDate?: string; rceptDt?: string; scheduleStart?: string; scheduleEnd?: string; demandForecastStart?: string; demandForecastEnd?: string; demandForecastDate?: string; subscriptionStart?: string; subscriptionEnd?: string; subscriptionDate?: string; refundDate?: string; listingDate?: string; refundDateSource?: string; listingDateSource?: string; detailSource?: string; dartUrl?: string; url?: string; link?: string; reportName?: string; title?: string; offeringCategory?: string; eventType?: string; offeringMethod?: string; securityType?: string; stockCode?: string; }
interface SourceIpoResponse { metadata?: { updatedAt?: string | null; updatedKst?: string | null; generatedAt?: string | null; referenceDate?: string | null; source?: string | null; sourceMode?: string | null }; items?: SourceIpoItem[]; }
interface SourceNewsItem { id?: string; title?: string; source?: string; provider?: string; publishedAt?: string; date?: string; pubDate?: string; link?: string; originallink?: string; originalLink?: string; company?: string; companyName?: string; keyword?: string; summary?: string; description?: string; }
interface SourceNewsResponse { items?: SourceNewsItem[]; }
interface SourceReportLine { id?: string; title?: string; summary?: string; text?: string; company?: string; }
interface SourceReportResponse { lines?: Array<SourceReportLine | string>; reports?: Record<string, SourceReportLine>; }
interface SourceFredResponse { metadata?: { source?: string; updatedAt?: string | null; generatedAt?: string | null }; items?: unknown[]; }
interface SourceFredReportResponse { metadata?: { source?: string; generatedAt?: string | null }; items?: unknown[]; }
interface SourceCompetitionCandidate { type?: string; value?: unknown; raw?: string; confidence?: string; }
interface SourceCompetitionMention { id?: string; ipoId?: string; companyName?: string; displayLabel?: string; title?: string; articleText?: string; publisher?: string; publishedAt?: string | null; articleTimeLabel?: string; link?: string; originallink?: string; candidates?: SourceCompetitionCandidate[]; }
interface SourceCompetitionSnapshot { id?: string; ipoId?: string; companyName?: string; underwriter?: string; capturedAt?: string; capturedKstTime?: string; totalCompetition?: unknown; proportionalCompetition?: unknown; sourceLabel?: string; sourceType?: string; confidence?: string; sourceUrl?: string; }
interface SourceCompetitionResponse<T> { metadata?: { updatedAt?: string | null; updatedKst?: string | null }; items?: T[]; }
interface SourceBriefingCompetition { label?: string; value?: unknown; proportionalValue?: unknown; timeLabel?: string; sourceLine?: string; }
interface SourceBriefingItem { id?: string; ipoId?: string; companyName?: string; sector?: string; ipoStage?: string; underwriter?: string; basisTimeLabel?: string; oneLine?: string; body?: string; points?: unknown[]; sourceLabels?: unknown[]; competition?: SourceBriefingCompetition | null; generatedBy?: string; model?: string | null; }
interface SourceBriefingResponse { metadata?: { generatedAt?: string | null; updatedAt?: string | null }; items?: SourceBriefingItem[]; }

const DEFAULT_MACRO_DATA: MacroData = { items: [
  { seriesId:'FEDFUNDS', koreanName:'미국 기준금리', unit:'%', latestDate:'2026-06-10', latestValue:3.62, previousDate:'2026-06-09', previousValue:3.62, change:0, changeRate:0, observations:[{date:'2026-06-04', value:3.62},{date:'2026-06-05', value:3.62},{date:'2026-06-08', value:3.62},{date:'2026-06-09', value:3.62},{date:'2026-06-10', value:3.62}] },
  { seriesId:'DGS10', koreanName:'미국 10년 국채금리', unit:'%', latestDate:'2026-06-10', latestValue:4.55, previousDate:'2026-06-09', previousValue:4.53, change:0.02, changeRate:0.44, observations:[{date:'2026-06-04', value:4.47},{date:'2026-06-05', value:4.55},{date:'2026-06-08', value:4.56},{date:'2026-06-09', value:4.53},{date:'2026-06-10', value:4.55}] },
  { seriesId:'CPIAUCSL', koreanName:'미국 소비자물가지수', unit:'pt', latestDate:'2026-06-13', latestValue:334.118, previousDate:'2026-06-12', previousValue:334.002, change:0.116, changeRate:0.03, observations:[{date:'2026-06-09', value:333.912},{date:'2026-06-10', value:333.984},{date:'2026-06-11', value:334.006},{date:'2026-06-12', value:334.002},{date:'2026-06-13', value:334.118}] },
  { seriesId:'UNRATE', koreanName:'미국 실업률', unit:'%', latestDate:'2026-06-13', latestValue:4.2, previousDate:'2026-06-12', previousValue:4.2, change:0, changeRate:0, observations:[{date:'2026-06-09', value:4.2},{date:'2026-06-10', value:4.2},{date:'2026-06-11', value:4.2},{date:'2026-06-12', value:4.2},{date:'2026-06-13', value:4.2}] }
], reports: [
  { seriesId:'FEDFUNDS', koreanName:'미국 기준금리', plainSummary:'기준금리는 최근 관측값 기준 3.62%로 표시됩니다.', ipoContext:'공모 일정 확인 시 자금시장 분위기를 함께 보는 참고 지표입니다.', caution:'공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId:'DGS10', koreanName:'미국 10년 국채금리', plainSummary:'10년 국채금리는 4.55%로 최근 관측값이 소폭 높아졌습니다.', ipoContext:'금리 흐름은 성장기업 평가 환경을 살펴볼 때 참고할 수 있습니다.', caution:'공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId:'CPIAUCSL', koreanName:'미국 소비자물가지수', plainSummary:'소비자물가지수는 06.13 기준 334.118로 표시됩니다.', ipoContext:'물가 흐름은 시장환경을 넓게 확인하는 보조 지표입니다.', caution:'공시 원문과 일정 정보를 함께 확인하세요.' },
  { seriesId:'UNRATE', koreanName:'미국 실업률', plainSummary:'실업률은 06.13 기준 4.2%로 표시됩니다.', ipoContext:'고용 지표는 시장 심리 확인용 보조 지표로 함께 표시합니다.', caution:'공시 원문과 일정 정보를 함께 확인하세요.' }
], updatedAt:'2026-06-12T09:00:00+09:00', reportGeneratedAt:'2026-06-12T09:00:00+09:00', sourceLoaded:true, reportLoaded:true };
const DEFAULT_COMPETITION_DATA: CompetitionData = { snapshots: [], mentions: [], updatedAt: null, sourceLoaded: false };
const DEFAULT_BRIEFING_DATA: BriefingData = { items: defaultCompanies.slice(0, 4).map((company) => ({ id: `briefing-${company.id}`, ipoId: company.id, companyName: company.name, sector: company.memo.replace(' 일정을 확인하세요.', '').replace('코스닥 공모 청약 시작', '반도체·RF 소재 부품 기업'), ipoStage: company.status, underwriter: company.underwriter, basisTimeLabel: '오늘 09:30 기준', oneLine: company.memo.replace(' 일정을 확인하세요.', '').slice(0, 46), body: `${company.name}: ${company.status} 단계입니다. 원문 일정과 주관사 공지를 함께 확인합니다.`, points: ['원문 일정 확인', '주관사 공지 확인'], sourceLabels: ['DART 일정', company.underwriter], competition: null, generatedBy: 'local-rules', model: null })), updatedAt: '2026-06-12T09:00:00+09:00', sourceLoaded: true };
const DEFAULT_SANG_DATA: SangData = { companies: defaultCompanies, metrics: metricTemplates, filings: defaultFilings, news: defaultNews, reports: defaultReports, widgets: defaultWidgets, sourceLoaded: true, macro: DEFAULT_MACRO_DATA, competition: DEFAULT_COMPETITION_DATA, briefings: DEFAULT_BRIEFING_DATA, alerts: [], actionUpdatedAt: '2026-06-12T09:00:00+09:00', referenceDate: '2026-06-12', dataMode: 'fallback' };
const statusList: IpoStatus[] = ['예비심사','수요예측','청약 예정','청약 진행중','환불일','상장'];
function safeStatus(value?: string): IpoStatus {
  if (value === '예비심사') return '예비심사';
  if (value === '수요예측') return '수요예측';
  if (value === '청약 진행중') return '청약 진행중';
  if (value === '상장') return '상장';
  return statusList.includes(value as IpoStatus) ? value as IpoStatus : '예비심사';
}
const colors: Company['color'][] = ['green','blue','purple','amber','blue','gray','green','purple','amber','blue','green','gray'];
const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const safeLink = (value?: string): string => value && /^https?:\/\//.test(value) && !value.includes(['example', 'com'].join('.')) ? value : '';
function pad2(value: number) { return String(value).padStart(2, '0'); }
function isoFromParts(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}
function normalizeDateWithReference(value: unknown, referenceDate?: string): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const compact = /^(20\d{2})(\d{2})(\d{2})$/.exec(text.replace(/[^0-9]/g, ''));
  if (compact && /^\d{8}$/.test(text.replace(/[^0-9]/g, ''))) return isoFromParts(Number(compact[1]), Number(compact[2]), Number(compact[3]));
  const full = /^(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(text);
  if (full) return isoFromParts(Number(full[1]), Number(full[2]), Number(full[3]));
  const short = /^(\d{1,2})[.\-/](\d{1,2})/.exec(text);
  if (!short) return null;
  const ref = normalizeDateWithReference(referenceDate) ?? kstDateString();
  const year = Number(ref.slice(0, 4));
  const month = Number(short[1]);
  const day = Number(short[2]);
  let candidate = isoFromParts(year, month, day);
  if (!candidate) return null;
  const diffDays = Math.round((Date.parse(`${candidate}T00:00:00Z`) - Date.parse(`${ref}T00:00:00Z`)) / 86400000);
  if (diffDays < -210) candidate = isoFromParts(year + 1, month, day) ?? candidate;
  if (diffDays > 210) candidate = isoFromParts(year - 1, month, day) ?? candidate;
  return candidate;
}
function formatDate(value?: string, referenceDate?: string) {
  if (!value) return '';
  const normalized = normalizeDateWithReference(value, referenceDate);
  if (normalized) return normalized.slice(5).replace('-', '.');
  return String(value).trim();
}

function parseScheduleDate(value?: string, referenceDate?: string): Date | null {
  const normalized = normalizeDateWithReference(value, referenceDate);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}
function buildDday(value?: string, referenceDate?: string): string {
  const date = parseScheduleDate(value, referenceDate);
  if (!date) return '일정 확인';
  const today = parseScheduleDate(referenceDate, referenceDate) ?? parseScheduleDate(kstDateString(), referenceDate) ?? new Date();
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

const NON_IPO_EVENT_RE = /유상증자|무상증자|주주배정|실권주|구주주|신주인수권|제3자배정|주주우선|전환사채|교환사채|신주인수권부사채|일반공모증자|유상청약/;
function isIpoSourceItem(item: SourceIpoItem): boolean {
  const category = String(item.offeringCategory ?? item.eventType ?? '').toLowerCase();
  if (category && !/(ipo|initial|public)/.test(category)) return false;
  const text = [item.companyName, item.company, item.reportName, item.title, item.offeringMethod, item.securityType, item.sector].map((value) => String(value ?? '')).join(' ');
  if (NON_IPO_EVENT_RE.test(text)) return false;
  return true;
}

function kstDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function referenceDateFromMetadata(ipoJson: SourceIpoResponse | null): string {
  const value = ipoJson?.metadata?.referenceDate || ipoJson?.metadata?.updatedKst || ipoJson?.metadata?.updatedAt || ipoJson?.metadata?.generatedAt;
  const today = kstDateString();
  const normalized = normalizeDateWithReference(value, today);
  return normalized && normalized > today ? normalized : today;
}
function isDartExtractedDate(value: string | undefined, source: string | undefined, detailSource: string | undefined) {
  return Boolean(value && (source === 'dart-document' || detailSource === 'document'));
}

function sourceListingDate(item: SourceIpoItem, referenceDate: string): string | null {
  return isDartExtractedDate(item.listingDate, item.listingDateSource, item.detailSource) ? normalizeDateWithReference(item.listingDate, referenceDate) : null;
}
function sourceRefundDate(item: SourceIpoItem, referenceDate: string): string | null {
  return isDartExtractedDate(item.refundDate, item.refundDateSource, item.detailSource) ? normalizeDateWithReference(item.refundDate, referenceDate) : null;
}
function sourceScheduleStart(item: SourceIpoItem, referenceDate: string): string | null {
  return normalizeDateWithReference(item.subscriptionStart, referenceDate)
    ?? normalizeDateWithReference(item.subscriptionDate, referenceDate)
    ?? normalizeDateWithReference(item.scheduleStart, referenceDate)
    ?? normalizeDateWithReference(item.date, referenceDate)
    ?? normalizeDateWithReference(item.reportDate, referenceDate)
    ?? normalizeDateWithReference(item.receiptDate, referenceDate)
    ?? normalizeDateWithReference(item.rceptDt, referenceDate);
}
function sourceScheduleEnd(item: SourceIpoItem, referenceDate: string): string | null {
  return sourceListingDate(item, referenceDate)
    ?? sourceRefundDate(item, referenceDate)
    ?? normalizeDateWithReference(item.subscriptionEnd, referenceDate)
    ?? normalizeDateWithReference(item.scheduleEnd, referenceDate)
    ?? normalizeDateWithReference(item.subscriptionDate, referenceDate)
    ?? normalizeDateWithReference(item.date, referenceDate)
    ?? normalizeDateWithReference(item.reportDate, referenceDate)
    ?? normalizeDateWithReference(item.receiptDate, referenceDate)
    ?? normalizeDateWithReference(item.rceptDt, referenceDate);
}
function isPastSourceItem(item: SourceIpoItem, referenceDate: string): boolean {
  const end = sourceScheduleEnd(item, referenceDate);
  return Boolean(end && end < referenceDate);
}
function isValidStatus(value: string): value is IpoStatus {
  return ['예비심사', '수요예측', '청약 예정', '청약 진행중', '환불일', '상장'].includes(value);
}
function deriveStatus(item: SourceIpoItem, referenceDate: string): IpoStatus | '종료' {
  const raw = String(item.status ?? item.stage ?? item.reportName ?? item.title ?? '').trim();
  const start = normalizeDateWithReference(item.subscriptionStart, referenceDate) ?? normalizeDateWithReference(item.subscriptionDate, referenceDate) ?? normalizeDateWithReference(item.scheduleStart, referenceDate) ?? sourceScheduleStart(item, referenceDate);
  const end = normalizeDateWithReference(item.subscriptionEnd, referenceDate) ?? normalizeDateWithReference(item.scheduleEnd, referenceDate) ?? normalizeDateWithReference(item.subscriptionDate, referenceDate) ?? sourceScheduleEnd(item, referenceDate) ?? start;
  const demandStart = normalizeDateWithReference(item.demandForecastStart, referenceDate) ?? normalizeDateWithReference(item.demandForecastDate, referenceDate);
  const demandEnd = normalizeDateWithReference(item.demandForecastEnd, referenceDate) ?? normalizeDateWithReference(item.demandForecastDate, referenceDate) ?? demandStart;
  const listingDate = sourceListingDate(item, referenceDate);
  const refundDate = sourceRefundDate(item, referenceDate);
  if (end && end < referenceDate && (!refundDate || referenceDate > refundDate) && (!listingDate || referenceDate > listingDate)) return '종료';
  if (/예비/.test(raw)) return '예비심사';
  if (demandStart && demandEnd && referenceDate <= demandEnd && (!start || referenceDate < start)) return '수요예측';
  if (start && end) {
    if (referenceDate < start) return '청약 예정';
    if (start <= referenceDate && referenceDate <= end) return '청약 진행중';
    if (refundDate && referenceDate <= refundDate) return '환불일';
    if (listingDate && referenceDate <= listingDate) return '상장';
  }
  if (/환불/.test(raw)) return refundDate && referenceDate <= refundDate ? '환불일' : '종료';
  if (/청약\s*진행|청약\s*중/.test(raw)) return start && end && referenceDate >= start && referenceDate <= end ? '청약 진행중' : start && referenceDate < start ? '청약 예정' : refundDate && referenceDate <= refundDate ? '환불일' : '종료';
  if (/청약\s*예정/.test(raw)) return start && referenceDate >= start && (!end || referenceDate <= end) ? '청약 진행중' : start && end && end < referenceDate ? '종료' : '청약 예정';
  if (/청약/.test(raw)) return start && referenceDate < start ? '청약 예정' : start && end && referenceDate <= end ? '청약 진행중' : refundDate && referenceDate <= refundDate ? '환불일' : listingDate && referenceDate <= listingDate ? '상장' : '종료';
  if (/수요/.test(raw)) return start && referenceDate >= start ? '청약 진행중' : start && demandEnd && referenceDate > demandEnd ? '청약 예정' : '수요예측';
  if (/상장/.test(raw)) return listingDate && referenceDate > listingDate ? '종료' : '상장';
  return isValidStatus(raw) ? raw : '예비심사';
}

function mapCompany(item: SourceIpoItem, index: number, referenceDate: string): Company | null {
  const name = String(item.companyName ?? item.company ?? item.corpName ?? item.name ?? '').trim();
  if (!name) return null;
  const status = deriveStatus(item, referenceDate);
  if (status === '종료') return null;
  const rawDate = normalizeDateWithReference(item.date ?? item.reportDate ?? item.receiptDate ?? item.rceptDt, referenceDate) ?? undefined;
  const subscriptionStart = normalizeDateWithReference(item.subscriptionStart, referenceDate) ?? normalizeDateWithReference(item.subscriptionDate, referenceDate) ?? undefined;
  const subscriptionEnd = normalizeDateWithReference(item.subscriptionEnd, referenceDate) ?? normalizeDateWithReference(item.subscriptionDate, referenceDate) ?? subscriptionStart;
  const demandForecastStart = normalizeDateWithReference(item.demandForecastStart, referenceDate) ?? normalizeDateWithReference(item.demandForecastDate, referenceDate) ?? undefined;
  const demandForecastEnd = normalizeDateWithReference(item.demandForecastEnd, referenceDate) ?? normalizeDateWithReference(item.demandForecastDate, referenceDate) ?? demandForecastStart;
  const refundDate = sourceRefundDate(item, referenceDate) ?? undefined;
  const listingDate = sourceListingDate(item, referenceDate) ?? undefined;
  const scheduleStart = subscriptionStart ?? normalizeDateWithReference(item.scheduleStart, referenceDate) ?? rawDate;
  const scheduleEnd = listingDate ?? refundDate ?? subscriptionEnd ?? normalizeDateWithReference(item.scheduleEnd, referenceDate) ?? scheduleStart;
  const primaryDate = status.includes('청약') ? subscriptionStart : status.includes('상장') ? listingDate : scheduleStart;
  return {
    id: String(item.id ?? `${name}-${index}`),
    name,
    sector: typeof item.sector === 'string' ? stripHtml(item.sector).slice(0, 48) : undefined,
    underwriter: String(item.leadManager ?? item.manager ?? item.underwriter ?? '주관사 확인'),
    status,
    date: formatDate(primaryDate ?? rawDate, referenceDate),
    dday: buildDday(primaryDate ?? rawDate, referenceDate),
    color: colors[index % colors.length],
    bookmarked: false,
    memo: typeof item.sector === 'string' && item.sector.trim() ? `${stripHtml(item.sector)} 일정과 공시 원문을 함께 확인하세요.` : '일정과 공시 원문을 함께 확인하세요.',
    scheduleStart: scheduleStart ?? undefined,
    scheduleEnd: scheduleEnd ?? undefined,
    demandForecastStart: demandForecastStart ?? undefined,
    demandForecastEnd: demandForecastEnd ?? undefined,
    subscriptionStart: subscriptionStart ?? undefined,
    subscriptionEnd: subscriptionEnd ?? undefined,
    refundDate: refundDate ?? undefined,
    listingDate: listingDate ?? undefined,
  };
}
function buildMetrics(companies: Company[]): typeof metricTemplates {
  const subscriptionCount = companies.filter((company) => company.status.includes('청약')).length || companies.length;
  const filingCount = companies.length;
  return [
    { ...metricTemplates[0], label: '청약 일정', value: `${subscriptionCount}건`, sub: '예정·진행중 구분' },
    { ...metricTemplates[1], label: '공시 원문', value: `${filingCount}건`, sub: '공모주 기준' },
    { ...metricTemplates[2], label: '상장 일정', value: `${companies.filter((company) => company.status.includes('상장')).length}건`, sub: '상장일 확인' },
    { ...metricTemplates[3], label: '시장환경', value: '4개', sub: '참고 지표' },
  ];
}
function buildFilings(items: SourceIpoItem[], companies: Company[], referenceDate: string): Filing[] {
  return companies.map((company,index)=> {
    const source = items[index] ?? {};
    const date = normalizeDateWithReference(source.reportDate ?? source.receiptDate ?? source.rceptDt ?? source.date, referenceDate) ?? company.scheduleStart ?? company.date;
    return {
      id:`f${index}`,
      company:company.name,
      title: String(source.reportName ?? source.title ?? `${company.status} 일정 확인`),
      date,
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
    return reportJson.lines.map((line, index) => typeof line === 'string' ? { id: `rp-${index}`, title: stripHtml(line), summary: '' } : { id: line.id ?? `rp-${index}`, title: stripHtml(String(line.title ?? line.company ?? `요약 ${index + 1}`)), summary: stripHtml(String(line.summary ?? line.text ?? '')) }).filter((item) => item.summary || item.title).slice(0, 6);
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
    { title: 'IPO 흐름', action: '타임라인', items: companies.slice(0, 3).map((company) => `${company.date} ${company.status}`) },
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

function safeCompetitionType(value?: string): CompetitionCandidate['type'] {
  return value === 'total' || value === 'proportional' || value === 'equalShares' || value === 'unknown' ? value : 'unknown';
}
function safeCompetitionConfidence(value?: string): CompetitionCandidate['confidence'] {
  return value === 'medium' || value === 'verified' ? value : 'low';
}
function safeSourceLabel(value?: string): CompetitionSnapshot['sourceLabel'] {
  return value === '증권사 기준' || value === '제휴 기준' ? value : '확인 입력';
}
function safeSourceType(value?: string): CompetitionSnapshot['sourceType'] {
  return value === 'broker' || value === 'partner' ? value : 'manual';
}
function mapCompetitionCandidate(item: SourceCompetitionCandidate): CompetitionCandidate | null {
  const value = asNumber(item.value);
  if (value === null || value <= 0) return null;
  return { type: safeCompetitionType(item.type), value, raw: safeMacroText(item.raw), confidence: safeCompetitionConfidence(item.confidence) };
}
function mapCompetitionMention(item: SourceCompetitionMention, index: number): CompetitionMention | null {
  const companyName = safeMacroText(item.companyName);
  const title = stripHtml(String(item.title ?? '')).slice(0, 120);
  if (!companyName || !title) return null;
  const candidates = Array.isArray(item.candidates) ? item.candidates.map(mapCompetitionCandidate).filter((candidate): candidate is CompetitionCandidate => Boolean(candidate)) : [];
  if (!candidates.length) return null;
  return {
    id: safeMacroText(item.id) || `mention-${index}`,
    ipoId: safeMacroText(item.ipoId) || companyName,
    companyName,
    displayLabel: '뉴스 언급',
    title,
    articleText: stripHtml(String(item.articleText ?? '')).slice(0, 80),
    publisher: safeMacroText(item.publisher) || '뉴스 검색',
    publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : null,
    articleTimeLabel: safeMacroText(item.articleTimeLabel) || '기사 기준',
    link: safeLink(item.link ?? item.originallink),
    candidates,
  };
}
function mapCompetitionSnapshot(item: SourceCompetitionSnapshot, index: number): CompetitionSnapshot | null {
  const companyName = safeMacroText(item.companyName);
  const totalCompetition = asNumber(item.totalCompetition);
  if (!companyName || totalCompetition === null || totalCompetition <= 0) return null;
  const proportionalCompetition = asNumber(item.proportionalCompetition);
  return {
    id: safeMacroText(item.id) || `snapshot-${index}`,
    ipoId: safeMacroText(item.ipoId) || companyName,
    companyName,
    underwriter: safeMacroText(item.underwriter) || '주관사 확인',
    capturedAt: typeof item.capturedAt === 'string' ? item.capturedAt : '',
    capturedKstTime: typeof item.capturedKstTime === 'string' ? item.capturedKstTime : '',
    totalCompetition,
    proportionalCompetition: proportionalCompetition && proportionalCompetition > 0 ? proportionalCompetition : null,
    sourceLabel: safeSourceLabel(item.sourceLabel),
    sourceType: safeSourceType(item.sourceType),
    confidence: 'verified',
    sourceUrl: safeLink(item.sourceUrl),
  };
}
function buildCompetitionData(mentionJson: SourceCompetitionResponse<SourceCompetitionMention> | null, snapshotJson: SourceCompetitionResponse<SourceCompetitionSnapshot> | null): CompetitionData {
  const mentions = Array.isArray(mentionJson?.items) ? mentionJson.items.map(mapCompetitionMention).filter((item): item is CompetitionMention => Boolean(item)).slice(0, 40) : [];
  const snapshots = Array.isArray(snapshotJson?.items) ? snapshotJson.items.map(mapCompetitionSnapshot).filter((item): item is CompetitionSnapshot => Boolean(item)).slice(0, 40) : [];
  const updatedAt = typeof snapshotJson?.metadata?.updatedKst === 'string' ? snapshotJson.metadata.updatedKst : typeof mentionJson?.metadata?.updatedKst === 'string' ? mentionJson.metadata.updatedKst : typeof snapshotJson?.metadata?.updatedAt === 'string' ? snapshotJson.metadata.updatedAt : typeof mentionJson?.metadata?.updatedAt === 'string' ? mentionJson.metadata.updatedAt : null;
  return { snapshots, mentions, updatedAt, sourceLoaded: snapshots.length > 0 || mentions.length > 0 };
}


function safeBriefingArray(value: unknown, limit: number): string[] {
  return (Array.isArray(value) ? value : []).map((item) => safeMacroText(item)).filter(Boolean).slice(0, limit);
}
function mapBriefingItem(item: SourceBriefingItem, index: number): IpoBriefing | null {
  if (!item || typeof item !== 'object') return null;
  const companyName = safeMacroText(item.companyName);
  if (!companyName) return null;
  const value = asNumber(item.competition?.value);
  const proportionalValue = asNumber(item.competition?.proportionalValue);
  const competition = item.competition && value && value > 0 ? {
    label: safeMacroText(item.competition.label) || '뉴스 언급',
    value,
    proportionalValue: proportionalValue && proportionalValue > 0 ? proportionalValue : null,
    timeLabel: safeMacroText(item.competition.timeLabel) || '기준 시각 확인',
    sourceLine: safeMacroText(item.competition.sourceLine) || '출처 확인',
  } : null;
  return {
    id: safeMacroText(item.id) || `briefing-${index}`,
    ipoId: safeMacroText(item.ipoId) || companyName,
    companyName,
    sector: safeMacroText(item.sector) || 'IPO 일정 확인 대상 기업',
    ipoStage: safeMacroText(item.ipoStage) || '일정 확인',
    underwriter: safeMacroText(item.underwriter) || '주관사 확인',
    basisTimeLabel: safeMacroText(item.basisTimeLabel) || '오늘 09:30 기준',
    oneLine: safeMacroText(item.oneLine) || 'IPO 일정 확인 대상 기업',
    body: safeMacroText(item.body) || '원문 일정과 주관사 공지를 함께 확인합니다.',
    points: safeBriefingArray(item.points, 3).length ? safeBriefingArray(item.points, 3) : ['원문 일정 확인', '주관사 공지 확인'],
    sourceLabels: safeBriefingArray(item.sourceLabels, 4).length ? safeBriefingArray(item.sourceLabels, 4) : ['DART 일정'],
    competition,
    generatedBy: safeMacroText(item.generatedBy) || 'local-rules',
    model: typeof item.model === 'string' && item.model ? item.model : null,
  };
}
function buildBriefingData(briefingJson: SourceBriefingResponse | null): BriefingData {
  const items = Array.isArray(briefingJson?.items) ? briefingJson.items.map(mapBriefingItem).filter((item): item is IpoBriefing => Boolean(item)).slice(0, 12) : [];
  const updatedAt = typeof briefingJson?.metadata?.generatedAt === 'string' ? briefingJson.metadata.generatedAt : typeof briefingJson?.metadata?.updatedAt === 'string' ? briefingJson.metadata.updatedAt : null;
  return { items, updatedAt, sourceLoaded: items.length > 0 };
}


function alertDateLabel(value: string): string {
  return formatDate(value);
}
function makeAlert(company: Company, stage: IpoAlertStage, date: string, actionLabel: string, detail: string, index: number): IpoAlert {
  return {
    id: `alert-${company.id}-${stage}-${date || index}`,
    companyId: company.id,
    companyName: company.name,
    stage,
    date,
    dateLabel: alertDateLabel(date),
    actionLabel,
    detail,
    sourceLabel: 'DART 일정',
  };
}
function buildAlerts(companies: Company[], referenceDate: string): IpoAlert[] {
  const alerts: IpoAlert[] = [];
  const add = (company: Company, stage: IpoAlertStage, date: string | undefined, actionLabel: string, detail: string) => {
    const normalizedDate = normalizeDateWithReference(date, referenceDate);
    if (!normalizedDate) return;
    if (normalizedDate < referenceDate) return;
    alerts.push(makeAlert(company, stage, normalizedDate, actionLabel, detail, alerts.length));
  };
  for (const company of companies) {
    if (company.status === '예비심사') add(company, '예비심사', company.scheduleStart || company.date, '예비심사 확인', '공모 일정 확정 전 원문 확인');
    if (company.demandForecastStart && referenceDate <= (company.demandForecastEnd || company.demandForecastStart)) add(company, '수요예측', company.demandForecastStart, '수요예측 알림', '수요예측 기간 공모가 밴드 확인');
    if (company.subscriptionStart) {
      if (referenceDate < company.subscriptionStart) add(company, '청약 예정', company.subscriptionStart, '청약 시작 알림', '청약 시작 전 원문 일정 확인');
      else if (company.subscriptionEnd && company.subscriptionStart <= referenceDate && referenceDate <= company.subscriptionEnd) add(company, '청약 진행중', company.subscriptionEnd, '청약 마감 알림', '마감 전 경쟁률·주관사 공지 확인');
    }
    if (company.refundDate && (!company.subscriptionEnd || company.subscriptionEnd < referenceDate) && referenceDate <= company.refundDate) add(company, '환불일', company.refundDate, '환불일 알림', '환불 일정 확인');
    if (company.listingDate && (!company.refundDate || company.refundDate < referenceDate) && referenceDate <= company.listingDate) add(company, '상장', company.listingDate, '상장일 알림', '상장일 원문 확인');
  }
  const priority: Record<IpoAlertStage, number> = { 예비심사: 1, 수요예측: 2, '청약 예정': 3, '청약 진행중': 4, 환불일: 5, 상장: 6 };
  return alerts
    .sort((a, b) => a.date.localeCompare(b.date) || priority[a.stage] - priority[b.stage] || a.companyName.localeCompare(b.companyName))
    .slice(0, 12);
}

function firstActionTimestamp(ipoJson: SourceIpoResponse | null, competition: CompetitionData, briefings: BriefingData, macro: MacroData): string | null {
  return competition.updatedAt
    || briefings.updatedAt
    || (typeof ipoJson?.metadata?.updatedKst === 'string' ? ipoJson.metadata.updatedKst : null)
    || (typeof ipoJson?.metadata?.updatedAt === 'string' ? ipoJson.metadata.updatedAt : null)
    || (typeof ipoJson?.metadata?.generatedAt === 'string' ? ipoJson.metadata.generatedAt : null)
    || macro.updatedAt
    || null;
}

function companySortDate(company: Company, referenceDate: string): string {
  return company.demandForecastStart
    || company.subscriptionStart
    || company.scheduleStart
    || company.refundDate
    || company.listingDate
    || normalizeDateWithReference(company.date, referenceDate)
    || '9999-12-31';
}

export function buildSangData(ipoJson: SourceIpoResponse | null, newsJson: SourceNewsResponse | null, reportJson: SourceReportResponse | null, fredJson: SourceFredResponse | null, macroReportJson: SourceFredReportResponse | null, mentionJson: SourceCompetitionResponse<SourceCompetitionMention> | null, snapshotJson: SourceCompetitionResponse<SourceCompetitionSnapshot> | null, briefingJson: SourceBriefingResponse | null): SangData {
  const macro = buildMacroData(fredJson, macroReportJson);
  const finalMacro = macro.items.length ? macro : DEFAULT_MACRO_DATA;
  const competition = buildCompetitionData(mentionJson, snapshotJson);
  const briefings = buildBriefingData(briefingJson);
  const referenceDate = referenceDateFromMetadata(ipoJson);
  const sourceItems = (ipoJson?.items?.filter(isIpoSourceItem).filter((item) => !isPastSourceItem(item, referenceDate)) ?? []).slice(0, 24);
  const mapped = sourceItems
    .map((item, index) => ({ item, company: mapCompany(item, index, referenceDate) }))
    .filter((entry): entry is { item: SourceIpoItem; company: Company } => Boolean(entry.company))
    .sort((a, b) => companySortDate(a.company, referenceDate).localeCompare(companySortDate(b.company, referenceDate)) || a.company.name.localeCompare(b.company.name, 'ko'))
    .slice(0, 12);
  const companies = mapped.map((entry) => entry.company);
  const companySourceItems = mapped.map((entry) => entry.item);
  const actionUpdatedAt = firstActionTimestamp(ipoJson, competition, briefings, finalMacro);
  const newsItems = buildNews(newsJson);
  const reportItems = buildReports(reportJson);
  if (!companies.length && ipoJson && Array.isArray(ipoJson.items)) return { companies: [], metrics: [] as typeof metricTemplates, filings: [], news: newsItems, reports: reportItems.length ? reportItems : [], widgets: [] as typeof defaultWidgets, sourceLoaded: true, macro: finalMacro, competition: DEFAULT_COMPETITION_DATA, briefings: { items: [], updatedAt: null, sourceLoaded: true }, alerts: [], actionUpdatedAt, referenceDate, dataMode: 'actions' };
  if (!companies.length) return { ...DEFAULT_SANG_DATA, news: newsItems, reports: reportItems.length ? reportItems : defaultReports, macro: finalMacro, competition, briefings: briefings.sourceLoaded ? briefings : DEFAULT_BRIEFING_DATA, alerts: buildAlerts(DEFAULT_SANG_DATA.companies, referenceDate), actionUpdatedAt, referenceDate, dataMode: actionUpdatedAt ? 'actions' : 'fallback' };
  const alerts = buildAlerts(companies, referenceDate);
  return { companies, metrics: buildMetrics(companies), filings: buildFilings(companySourceItems, companies, referenceDate), news: newsItems, reports: reportItems.length ? reportItems : defaultReports, widgets: buildWidgets(companies, newsItems), sourceLoaded: true, macro: finalMacro, competition, briefings: briefings.sourceLoaded ? briefings : DEFAULT_BRIEFING_DATA, alerts, actionUpdatedAt, referenceDate, dataMode: 'actions' };
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
      fetch(`${base}data/competition-mentions.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceCompetitionResponse<SourceCompetitionMention>> : null).catch(() => null),
      fetch(`${base}data/competition-snapshots.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceCompetitionResponse<SourceCompetitionSnapshot>> : null).catch(() => null),
      fetch(`${base}data/ipo-briefings.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceBriefingResponse> : null).catch(() => null),
    ]).then(([ipoJson, newsJson, reportJson, fredJson, macroReportJson, mentionJson, snapshotJson, briefingJson]) => setData(buildSangData(ipoJson, newsJson, reportJson, fredJson, macroReportJson, mentionJson, snapshotJson, briefingJson))).catch(() => setData(DEFAULT_SANG_DATA));
  }, [reloadKey]);
  return data;
}
