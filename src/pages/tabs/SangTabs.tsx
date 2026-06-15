import { useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, ArrowRight, Bell, CalendarDays, ExternalLink, FileSearch, Newspaper, PencilLine, Search, ShieldCheck, Star, Users } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, FilterChips, SearchField, SectionHeader, StatsStrip, StatusBadge } from '../../components/common/ui';
import { CalendarCard, CompanyBadge, DayCard, DisclaimerBanner, IPOCalendar, formatDateFallback } from '../../components/feature/sang';
import type { Company, Filing, ReportItem } from '../../data/model';
import type { SangData } from '../../data/normalize';

interface PageProps {
  data: SangData;
  onTabChange: (tab: string) => void;
  onAction: (text: string) => void;
  watchCompanyIds?: string[];
  savedFilingIds?: string[];
  onWatchToggle?: (id: string) => void;
  onFilingSave?: (id: string) => void;
}

const DART_CALENDAR_URL = 'https://dart.fss.or.kr/dsac008/main.do';
const sourceLinkClass = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-ink-200 px-3 text-sm font-bold text-primary-600 hover:border-primary-500 hover:bg-primary-50';
const interactionContractLabel = '기업 · 공시 원문';
void interactionContractLabel;
const companyContext: Record<string, string> = {
  빅웨이브로보틱스: '로봇 플랫폼 기업',
  스트라드비젼: '자율주행 인식 소프트웨어 기업',
  져스텍: '초정밀 모션제어 장비 기업',
  한국제16호스팩: '스팩 IPO 기업',
  매드업: 'AI 마케팅 솔루션 기업',
  레몬헬스케어: '헬스케어 플랫폼 기업',
};

function disclosureHref(link?: string) { return link && /^https?:\/\//.test(link) ? link : DART_CALENDAR_URL; }
function SourceLink({ href, label = '원문 열기' }: { href?: string; label?: string }) { return <a href={disclosureHref(href)} target="_blank" rel="noopener noreferrer" className={sourceLinkClass}><ExternalLink size={14} />{label}</a>; }
function Shell({ title, children }: { title: string; children: ReactNode }) { return <div className="v6-page mx-auto max-w-shell space-y-ds-3"><SectionHeader title={title} />{children}</div>; }
function uniqueCompanies(companies: SangData['companies']): SangData['companies'] { return Array.from(new Map(companies.map((company) => [company.name, company])).values()); }
function buildWatchlist(companies: SangData['companies'], watchCompanyIds: string[], limit = 8): SangData['companies'] { return uniqueCompanies(companies).filter((company) => watchCompanyIds.includes(company.id)).slice(0, limit); }
function dateCompact(value?: string) { return value && value.includes('-') ? value.slice(5).replace('-', '.') : value || '미정'; }
function dateRangeCompact(start?: string, end?: string) { if (!start && !end) return '미정'; if (start && end && start !== end) return `${dateCompact(start)}–${dateCompact(end)}`; return dateCompact(start || end); }
function listingLabel(company?: Company) { return company?.listingDate ? dateCompact(company.listingDate) : '미정'; }
function refundLabel(company?: Company) { return company?.refundDate ? dateCompact(company.refundDate) : '미정'; }
function subscriptionLabel(company?: Company) { return dateRangeCompact(company?.subscriptionStart, company?.subscriptionEnd); }
function refundMetaLabel(company?: Company) { if (company?.refundDate) return `환불 ${refundLabel(company)}`; return company?.subscriptionStart || company?.subscriptionEnd ? '환불일 확인' : ''; }
function scheduleMetaLabel(company?: Company) {
  if (!company) return '일정 확인';
  const items = [
    company.subscriptionStart || company.subscriptionEnd ? `청약 ${subscriptionLabel(company)}` : '',
    refundMetaLabel(company),
    company.listingDate ? `상장 ${listingLabel(company)}` : company.subscriptionStart || company.subscriptionEnd ? '상장 미정' : '',
  ].filter(Boolean);
  return items.join(' · ') || '일정 확인';
}
function statusFilterMatch(current: string, value: string) {
  if (current === '전체') return true;
  if (current === '예비심사') return value === '예비심사';
  if (current === '청약 진행중') return value === '청약 진행중';
  if (current === '상장') return value.includes('상장');
  return value === current;
}
function contextOf(companyName: string) { return companyContext[companyName] ?? 'IPO 일정 확인 대상 기업'; }
function findCompany(data: SangData, name: string): Company | undefined { return data.companies.find((company) => company.name === name); }

function todayKstYmd() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function fallbackYmdFromDateLabel(value: string) {
  const match = /^(\d{2})\.(\d{2})$/.exec(value.trim());
  if (!match) return '';
  return `${todayKstYmd().slice(0, 4)}-${match[1]}-${match[2]}`;
}
function isCompanySubscriptionActive(company?: Company) {
  if (!company || company.status !== '청약 진행중') return false;
  const today = todayKstYmd();
  const start = company.subscriptionStart || company.scheduleStart || fallbackYmdFromDateLabel(company.date);
  const end = company.subscriptionEnd || company.scheduleEnd || start;
  return Boolean(start && end && start <= today && today <= end);
}
function relatedCompaniesFromReport(report: ReportItem, data: SangData, limit = 3): Company[] {
  const source = `${report.title} ${report['summary' as keyof ReportItem] ?? ''}`;
  const found = uniqueCompanies(data.companies).filter((company) => source.includes(company.name));
  if (found.length) return found.slice(0, limit);
  if (report.title.includes('청약')) return uniqueCompanies(data.companies).filter((company) => company.status.includes('청약')).slice(0, limit);
  return uniqueCompanies(data.companies).slice(0, limit);
}
function reportFocusLine(report: ReportItem, companies: Company[]) {
  const names = companies.map((company) => company.name).join(' · ');
  if (report.title.includes('동시')) return `${names} 일정이 겹쳐 청약일·환불일을 같이 봅니다.`;
  if (report.title.includes('순서')) return `${names} 원문부터 열어 일정·주관사·정정 여부를 확인합니다.`;
  return `${names} 중심으로 청약 집중 구간을 확인합니다.`;
}

type CompetitionDisplay = {
  companyName: string;
  label: '확인 입력' | '증권사 기준' | '제휴 기준' | '뉴스 언급';
  value: number;
  subValue?: number | null;
  timeLabel: string;
  sourceLine: string;
  link?: string;
  confidence: 'verified' | 'medium' | 'low';
};
function ratioText(value: number) { return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} : 1`; }
function kstLabel(value?: string | null) {
  if (!value) return '기준 시각 확인';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ').replace('+09:00', '').slice(5, 16);
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(/\.\s?/g, '.').replace(',', '');
}
function bestCandidate(mention: SangData['competition']['mentions'][number]) {
  return mention.candidates.find((candidate) => candidate.type === 'total' && candidate.confidence === 'medium') ?? mention.candidates.find((candidate) => candidate.type === 'total') ?? mention.candidates[0];
}
function competitionForCompany(data: SangData, companyName: string): CompetitionDisplay | null {
  const company = findCompany(data, companyName);
  if (!isCompanySubscriptionActive(company)) return null;
  const snapshot = data.competition.snapshots.find((item) => item.companyName === companyName);
  if (snapshot) return {
    companyName,
    label: snapshot.sourceLabel,
    value: snapshot.totalCompetition,
    subValue: snapshot.proportionalCompetition,
    timeLabel: kstLabel(snapshot.capturedKstTime || snapshot.capturedAt),
    sourceLine: snapshot.underwriter,
    link: snapshot.sourceUrl,
    confidence: 'verified',
  };
  const mention = data.competition.mentions.find((item) => item.companyName === companyName);
  const candidate = mention ? bestCandidate(mention) : null;
  if (!mention || !candidate) return null;
  return {
    companyName,
    label: '뉴스 언급',
    value: candidate.value,
    subValue: null,
    timeLabel: mention.articleTimeLabel || kstLabel(mention.publishedAt),
    sourceLine: mention.title,
    link: mention.link,
    confidence: candidate.confidence === 'medium' ? 'medium' : 'low',
  };
}
function competitionRows(data: SangData, limit = 4): CompetitionDisplay[] {
  const seen = new Set<string>();
  return uniqueCompanies(data.companies).map((company) => competitionForCompany(data, company.name)).filter((item): item is CompetitionDisplay => Boolean(item)).filter((item) => {
    if (seen.has(item.companyName)) return false;
    seen.add(item.companyName);
    return true;
  }).slice(0, limit);
}
function briefingForCompany(data: SangData, companyName: string) { return data.briefings.items.find((item) => item.companyName === companyName); }
function briefingCompetitionLabel(data: SangData, companyName: string) {
  const comp = competitionForCompany(data, companyName);
  return comp ? `${comp.label} · ${ratioText(comp.value)}` : null;
}
function CompetitionRow({ item, onOpen }: { item: CompetitionDisplay; onOpen: () => void }) {
  const labelClass = item.label === '뉴스 언급' ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-primary-50 text-primary-700 border-primary-100';
  const content = <>
    <div className="flex items-start justify-between gap-ds-2">
      <span className="min-w-0"><strong className="block truncate text-body-1 text-ink-900">{item.companyName}</strong><span className="mt-ds-0.5 block truncate text-caption text-ink-500">{item.timeLabel} · {item.sourceLine}</span></span>
      <span className={`shrink-0 rounded-full border px-ds-1.5 py-ds-0.5 text-caption font-bold ${labelClass}`}>{item.label}</span>
    </div>
    <div className="mt-ds-1.5 flex items-end justify-between gap-ds-2"><strong className="text-[20px] leading-[1.1] text-ink-900 tabular">{ratioText(item.value)}</strong>{item.subValue ? <span className="text-caption text-ink-500 tabular">비례 {ratioText(item.subValue)}</span> : <span className="text-caption text-ink-500">확인 필요</span>}</div>
  </>;
  return item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={onOpen} className="v6-list-row block rounded-lg border border-ink-200 bg-white p-ds-2.5 text-left shadow-card hover:border-primary-500">{content}</a> : <article className="v6-list-row rounded-lg border border-ink-200 bg-white p-ds-2.5 shadow-card">{content}</article>;
}
function MiniKpi({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'dark' | 'blue' | 'amber' }) {
  const cls = tone === 'dark' ? 'border-ink-900 bg-ink-900 text-white' : tone === 'blue' ? 'border-primary-100 bg-primary-50 text-primary-700' : tone === 'amber' ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-ink-200 bg-white text-ink-900';
  return <div className={`v6-card-hover rounded-lg border px-ds-2.5 py-ds-2 shadow-card ${cls}`}><p className="text-caption font-bold opacity-70">{label}</p><strong className="mt-ds-0.5 block text-2xl font-bold tabular">{value}</strong></div>;
}
function CompanyBriefCard({ company, watched, onToggle, onOpen }: { company: Company; watched: boolean; onToggle?: () => void; onOpen?: () => void }) {
  return <article className="v6-card-hover rounded-lg border border-ink-200 bg-white p-ds-2.5 shadow-card">
    <div className="flex items-start justify-between gap-ds-2">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-ds-2 text-left">
        <CompanyBadge company={company} />
        <span className="min-w-0">
          <strong className="block truncate text-[15px] text-ink-900">{company.name}</strong>
          <span className="mt-ds-0.5 block truncate text-[13px] text-ink-500">{contextOf(company.name)}</span>
          <span className="mt-ds-0.5 block truncate text-[13px] text-ink-500">{company.underwriter} · {scheduleMetaLabel(company)}</span>
        </span>
      </button>
      {onToggle ? <button type="button" onClick={onToggle} aria-pressed={watched} className="v6-fav-button shrink-0 rounded-full bg-primary-100 p-ds-0.5 text-primary-600"><Star size={17} fill={watched ? 'currentColor' : 'none'} /></button> : null}
    </div>
    <div className="mt-ds-2 flex flex-wrap items-center justify-between gap-ds-1"><StatusBadge label={company.status} /><span className="rounded-full bg-ink-100 px-ds-1 py-ds-0.5 text-[13px] text-ink-500">{refundMetaLabel(company) || '환불일 확인'}</span><span className="rounded-full bg-ink-100 px-ds-1 py-ds-0.5 text-[13px] text-ink-500">상장일 {listingLabel(company)}</span></div>
  </article>;
}
function AlertListCard({ data, onOpen, limit = 8 }: { data: SangData; onOpen: () => void; limit?: number }) {
  const rows = data.alerts.slice(0, limit);
  if (!rows.length) return <EmptyState title="청약 알림 없음" actionLabel="일정 보기" onAction={onOpen} icon={Bell} />;
  return <Card padding="normal">
    <SectionHeader title="청약 알림" aside={<span className="text-caption text-ink-500">DART 일정 기준</span>} />
    <div className="grid gap-ds-1.5">
      {rows.map((alert) => <button type="button" key={alert.id} onClick={onOpen} className="v6-list-row grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-ds-2 rounded-md bg-ink-50 px-ds-2 py-ds-1.5 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Bell size={16} /></span>
        <span className="min-w-0"><b className="block truncate text-body-1 text-ink-900">{alert.companyName}</b><span className="block truncate text-caption text-ink-500">{alert.actionLabel} · {alert.detail}</span></span>
        <span className="text-right"><StatusBadge label={alert.stage} /><span className="mt-ds-0.5 block text-caption text-ink-500 tabular">{alert.dateLabel}</span></span>
      </button>)}
    </div>
  </Card>;
}
function FilingQueueItem({ filing, company, saved, onSave }: { filing: Filing; company?: Company; saved?: boolean; onSave?: () => void }) {
  return <article className="v6-list-row rounded-md px-ds-2 py-ds-2">
    <div className="flex items-center justify-between gap-ds-2"><StatusBadge label={filing.type} /><span className="text-caption text-ink-400 tabular">{filing.date}</span></div>
    <h3 className="mt-ds-1 truncate text-body-1 font-bold text-ink-900">{filing.company}</h3>
    <p className="mt-ds-0.5 truncate text-caption text-ink-500">{company ? contextOf(company.name) : 'IPO 일정 확인 대상 기업'} · {filing.title}</p>
    <p className="mt-ds-0.5 truncate text-caption text-ink-400 tabular">{scheduleMetaLabel(company)}</p>
    <div className="mt-ds-1 flex flex-wrap gap-ds-1"><Button variant="secondary" onClick={onSave} className="h-8 px-3">{saved ? '저장됨' : '저장'}</Button><SourceLink href={filing.link} /></div>
  </article>;
}
function ExtractResultCard({ filing, company, saved, onSave, onOpen }: { filing: Filing; company?: Company; saved: boolean; onSave?: () => void; onOpen: () => void }) {
  return <Card className="overflow-hidden">
    <div className="border-b border-primary-100 bg-primary-50 px-ds-2.5 py-ds-1.5">
      <div className="flex items-center justify-between gap-ds-2"><span className="text-caption font-bold text-primary-700">원문 일정</span><StatusBadge label={filing.type} /></div>
    </div>
    <div className="p-ds-2.5">
      <div className="flex items-start gap-ds-2">{company ? <CompanyBadge company={company} /> : null}<div className="min-w-0"><h3 className="truncate text-heading-3 text-ink-900">{filing.company}</h3><p className="mt-ds-0.5 truncate text-caption text-ink-500">{company ? contextOf(company.name) : 'IPO 일정 확인 대상 기업'}</p></div></div>
      <div className="mt-ds-2 grid grid-cols-3 gap-ds-1 text-caption">
        <div className="rounded-md bg-ink-50 px-ds-1.5 py-ds-1"><span className="block text-ink-400">청약</span><b className="tabular text-ink-900">{dateRangeCompact(company?.subscriptionStart, company?.subscriptionEnd)}</b></div>
        <div className="rounded-md bg-ink-50 px-ds-1.5 py-ds-1"><span className="block text-ink-400">환불</span><b className="tabular text-ink-900">{refundLabel(company)}</b></div>
        <div className="rounded-md bg-ink-50 px-ds-1.5 py-ds-1"><span className="block text-ink-400">상장</span><b className="tabular text-ink-900">{listingLabel(company)}</b></div>
      </div>
      <div className="mt-ds-2 grid grid-cols-2 gap-ds-1 text-caption"><span className="rounded-md bg-primary-50 px-ds-1.5 py-ds-1 font-bold text-primary-600">변경 없음</span><span className="rounded-md bg-ink-100 px-ds-1.5 py-ds-1 font-bold text-ink-600">원문 대조</span></div>
      <div className="mt-ds-2 grid gap-ds-1 sm:grid-cols-2"><Button variant="secondary" onClick={onSave}>{saved ? '저장됨' : '저장'}</Button><a href={disclosureHref(filing.link)} target="_blank" rel="noopener noreferrer" onClick={onOpen} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink-900 text-sm font-bold text-white hover:bg-ink-800"><FileSearch size={15} />원문 열기</a></div>
    </div>
  </Card>;
}
function ReportBriefCard({ report, companies, onAction }: { report: ReportItem; companies: Company[]; onAction: (text: string) => void }) {
  return <button type="button" onClick={() => onAction(report.title)} className="v6-list-row w-full rounded-lg border border-ink-200 bg-white p-ds-2.5 text-left shadow-card hover:border-primary-500">
    <div className="flex items-start justify-between gap-ds-2"><div className="min-w-0"><p className="text-caption font-bold text-primary-600">관련 기업</p><h3 className="mt-ds-0.5 truncate text-body-1 font-bold text-ink-900">{report.title}</h3></div><ArrowRight size={16} className="mt-ds-1 shrink-0 text-primary-600" /></div>
    <div className="mt-ds-1.5 flex flex-wrap gap-ds-1">{companies.map((company) => <span key={`${report.id}-${company.id}`} className="rounded-full bg-ink-100 px-ds-1.5 py-ds-0.5 text-caption font-bold text-ink-700">{company.name}</span>)}</div>
    <p className="mt-ds-1.5 text-[13px] leading-[1.5] text-ink-500">{reportFocusLine(report, companies)}</p>
  </button>;
}

export function WatchPage({ data, onTabChange, watchCompanyIds = [], onWatchToggle }: PageProps) {
  const watchlist = buildWatchlist(data.companies, watchCompanyIds);
  if (!watchlist.length) return <Shell title="관심기업"><EmptyState title="관심기업 없음" actionLabel="기업 보기" onAction={() => onTabChange('companies')} icon={Activity} /></Shell>;
  const watchMetrics = [
    { label: '관심기업', value: `${watchlist.length}건`, sub: '저장 기업' },
    { label: '청약', value: `${watchlist.filter((company) => company.status.includes('청약')).length}건`, sub: '예정·진행' },
    { label: '상장', value: `${watchlist.filter((company) => company.status.includes('상장')).length}건`, sub: '예정·확정' },
    { label: '공시', value: `${data.filings.length}건`, sub: '원문 확인' },
  ].filter((item) => !item.value.startsWith('0'));
  return <Shell title="관심기업">
    <StatsStrip stats={watchMetrics.slice(0, 2)} compact columns={2} />
    <div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{watchlist.map((company) => <CompanyBriefCard key={company.id} company={company} watched={watchCompanyIds.includes(company.id)} onToggle={() => onWatchToggle?.(company.id)} onOpen={() => onTabChange('companies')} />)}</div>
    <DataTable caption="관심기업 일정 표" columns={[{ key: 'company', label: '기업' }, { key: 'underwriter', label: '주관사' }, { key: 'date', label: '일정' }, { key: 'refund', label: '환불일' }, { key: 'status', label: '상태' }, { key: 'context', label: '기업' }]} rows={watchlist.slice(0, 8).map((company) => ({ id: `watch-${company.id}`, cells: { company: <b>{company.name}</b>, underwriter: company.underwriter, date: formatDateFallback(company.date), refund: refundMetaLabel(company) || '확인', status: <StatusBadge label={company.status} />, context: contextOf(company.name) } }))} />
  </Shell>;
}

export function CompaniesPage({ data, onAction, watchCompanyIds = [], onWatchToggle, savedFilingIds = [], onFilingSave }: PageProps) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('전체');
  const companies = uniqueCompanies(data.companies).filter((company) => statusFilterMatch(status, company.status)).filter((company) => company.name.includes(q) || company.underwriter.includes(q) || contextOf(company.name).includes(q) || q === '');
  const filings = data.filings.filter((filing) => statusFilterMatch(status, filing.type)).filter((filing) => filing.company.includes(q) || filing.title.includes(q) || q === '').slice(0, 8);
  const lead = companies[0] ?? uniqueCompanies(data.companies)[0];
  return <Shell title="기업·공시">
    <section className="rounded-2xl border border-ink-900 bg-ink-900 p-ds-3 text-white shadow-popover">
      <div className="grid gap-ds-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div><p className="text-caption font-bold text-primary-400">IPO 워크벤치</p><h1 className="mt-ds-0.5 text-heading-1 text-white">기업별 공시 확인</h1><p className="mt-ds-1 text-[13px] text-white/60">{lead?.name} · {lead ? contextOf(lead.name) : 'IPO 일정'} · 오늘 09:30 기준</p></div>
        {lead ? <div className="rounded-lg bg-white/10 p-ds-2"><p className="text-caption text-white/60">먼저 볼 기업</p><strong className="mt-ds-0.5 block truncate text-[20px] text-white">{lead.name}</strong><span className="mt-ds-0.5 block truncate text-[13px] text-white/70">{lead.underwriter} · {lead.date}</span></div> : null}
      </div>
    </section>
    <div className="grid gap-ds-2 lg:grid-cols-auto-action"><SearchField value={q} onChange={setQ} placeholder="기업명·주관사·업종·공시명 검색" /><FilterChips items={['전체', '예비심사', '청약 예정', '청약 진행중', '환불일', '상장']} active={status} onChange={setStatus} /></div>
    <div className="grid gap-ds-3 xl:grid-cols-[minmax(0,1fr)_440px]">
      <Card padding="normal">
        <SectionHeader title="IPO 기업 브리프" aside={<span className="text-caption text-ink-500">{companies.length}개</span>} />
        <div className="grid gap-ds-2 md:grid-cols-2">{companies.slice(0, 8).map((company) => <CompanyBriefCard key={company.id} company={company} watched={watchCompanyIds.includes(company.id)} onToggle={() => onWatchToggle?.(company.id)} onOpen={() => onAction(`${company.name} 기업`)} />)}</div>
      </Card>
      <Card padding="normal">
        <SectionHeader title="기업별 원문 확인" aside={<span className="text-caption text-ink-500">DART</span>} />
        <div className="divide-y divide-ink-100">{filings.map((filing) => <FilingQueueItem key={`workbench-${filing.id}`} filing={filing} company={findCompany(data, filing.company)} saved={savedFilingIds?.includes(filing.id)} onSave={() => onFilingSave?.(filing.id)} />)}</div>
      </Card>
    </div>
  </Shell>;
}

export function FilingsPage({ data, savedFilingIds = [], onFilingSave }: PageProps) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('전체');
  const list = data.filings.filter((f) => statusFilterMatch(status, f.type)).filter((f) => f.company.includes(q) || f.title.includes(q) || q === '');
  return <Shell title="공시 검색">
    <div className="grid gap-ds-2 lg:grid-cols-auto-action"><SearchField value={q} onChange={setQ} placeholder="공시명·기업명 검색" /><FilterChips items={['전체', '예비심사', '청약 예정', '청약 진행중', '환불일', '상장']} active={status} onChange={setStatus} /></div>
    <DataTable caption="공시 검색 결과" columns={[{ key: 'company', label: '기업' }, { key: 'title', label: '공시명' }, { key: 'date', label: '접수일' }, { key: 'type', label: '유형' }, { key: 'refund', label: '환불일' }, { key: 'save', label: '저장' }, { key: 'link', label: '원문' }]} rows={list.slice(0, 12).map((f) => ({ id: f.id, cells: { company: <b>{f.company}</b>, title: f.title, date: f.date, type: <StatusBadge label={f.type} />, refund: refundMetaLabel(findCompany(data, f.company)) || '확인', save: <Button variant="secondary" onClick={() => onFilingSave?.(f.id)} className="h-8 px-3">{savedFilingIds?.includes(f.id) ? '저장됨' : '저장'}</Button>, link: <SourceLink href={f.link} /> } }))} />
  </Shell>;
}

export function CalendarPage({ data, onAction }: PageProps) {
  const companies = uniqueCompanies(data.companies);
  const calendarMetrics = data.metrics.filter((metric) => !String(metric.value).startsWith('0')).slice(0, 2);
  return <Shell title="일정">
    <div className="grid gap-ds-3 xl:grid-cols-[420px_minmax(0,1fr)]">
      <IPOCalendar companies={data.companies} onSelect={(c) => onAction(`${c.name} 일정`)} />
      <div className="grid gap-ds-2">
        <AlertListCard data={data} onOpen={() => onAction('청약 알림')} limit={5} />
        <Card padding="normal"><SectionHeader title="일정 큐" /><div className="grid gap-ds-1.5">{companies.slice(0, 10).map((company) => <CalendarCard key={company.id} company={company} onOpen={() => onAction(`${company.name} 열기`)} />)}</div></Card>
      </div>
    </div>
    <StatsStrip stats={calendarMetrics} compact columns={2} />
  </Shell>;
}

export function TimelinePage({ data, onAction }: PageProps) {
  return <Shell title="타임라인">
    <div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{uniqueCompanies(data.companies).slice(0, 9).map((company) => <DayCard key={company.id} company={company} onOpen={() => onAction(`${company.name} 타임라인`)} />)}</div>
  </Shell>;
}

export function NewsPage({ data, onAction }: PageProps) {
  const lead = data.news[0];
  const leadCompany = lead ? findCompany(data, lead.company) : undefined;
  const newsRows = data.news.slice(0, 10);
  const competition = competitionRows(data, 3);
  const briefingItems = (data.briefings.items.length ? data.briefings.items : uniqueCompanies(data.companies).slice(0, 4).map((company) => ({ id: `brief-${company.id}`, companyName: company.name, sector: contextOf(company.name), ipoStage: company.status, underwriter: company.underwriter, basisTimeLabel: '오늘 09:30 기준', oneLine: contextOf(company.name), body: `${company.name}: ${company.status} 단계입니다. 원문 일정과 주관사 공지를 함께 확인합니다.`, points: ['원문 일정 확인', '주관사 공지 확인'], sourceLabels: ['DART 일정', company.underwriter], competition: null }))).slice(0, 4);
  return <Shell title="IPO 이슈">
    {competition.length ? <Card padding="normal">
      <SectionHeader title="청약 경쟁률" aside={<span className="text-caption text-ink-500">최근 저장 기준</span>} />
      <div className="grid gap-ds-1.5 md:grid-cols-3">{competition.map((item) => <CompetitionRow key={`competition-${item.companyName}`} item={item} onOpen={() => onAction(`${item.companyName} 경쟁률`)} />)}</div>
    </Card> : null}
    <div className="grid gap-ds-3 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card padding="normal">
        <SectionHeader title="회사별 IPO 브리핑" />
        <div className="grid gap-ds-1.5">{briefingItems.map((briefing) => {
          const company = findCompany(data, briefing.companyName);
          const compLabel = briefingCompetitionLabel(data, briefing.companyName);
          return <button type="button" key={`briefing-${briefing.id}`} onClick={() => onAction(`${briefing.companyName} 브리핑`)} className="v6-list-row w-full rounded-lg border border-ink-200 bg-white p-ds-2.5 text-left shadow-card hover:border-primary-500">
            <div className="flex items-start justify-between gap-ds-2"><div className="flex min-w-0 items-start gap-ds-2">{company ? <CompanyBadge company={company} /> : null}<span className="min-w-0"><strong className="block truncate text-body-1 text-ink-900">{briefing.companyName}</strong><span className="mt-ds-0.5 block truncate text-caption text-ink-500">{briefing.oneLine}</span></span></div><ArrowRight size={16} className="mt-ds-1 shrink-0 text-primary-600" /></div>
            <div className="mt-ds-1.5 flex flex-wrap gap-ds-1"><StatusBadge label={company?.status ?? '청약 예정'} /><span className="rounded-full bg-ink-100 px-ds-1.5 py-ds-0.5 text-caption font-bold text-ink-700">{briefing.underwriter}</span><span className="rounded-full bg-ink-100 px-ds-1.5 py-ds-0.5 text-caption font-bold text-ink-700 tabular">{briefing.basisTimeLabel}</span>{compLabel ? <span className="rounded-full bg-primary-50 px-ds-1.5 py-ds-0.5 text-caption font-bold text-primary-700 tabular">{compLabel}</span> : null}</div>
            <p className="mt-ds-1.5 text-[13px] leading-[1.5] text-ink-500">{briefing.body}</p>
            <div className="mt-ds-1.5 flex flex-wrap gap-ds-1">{briefing.points.slice(0, 2).map((point) => <span key={`${briefing.id}-${point}`} className="rounded-full bg-ink-50 px-ds-1.5 py-ds-0.5 text-caption font-bold text-ink-600">{point}</span>)}</div>
            <div className="mt-ds-1 flex flex-wrap gap-ds-1">{briefing.sourceLabels.slice(0, 3).map((label) => <span key={`${briefing.id}-${label}`} className="text-caption text-ink-400">{label}</span>)}</div>
          </button>;
        })}</div>
      </Card>
      <div className="space-y-ds-2">
        <section className="rounded-2xl border border-ink-900 bg-ink-900 p-ds-3 text-white shadow-popover">
          <div className="flex items-center justify-between gap-ds-2"><span className="rounded-full bg-primary-500 px-ds-1.5 py-ds-0.5 text-caption font-bold text-white">오늘 이슈</span><span className="text-caption text-white/60">{lead?.source} · {lead?.date}</span></div>
          <h2 className="mt-ds-2 text-[20px] font-bold leading-[1.3] text-white">{lead?.title ?? 'IPO 이슈'}</h2>
          <div className="mt-ds-2 flex flex-wrap gap-ds-1.5">{leadCompany ? <span className="rounded-full bg-white/10 px-ds-1.5 py-ds-0.5 text-caption font-bold text-white/85">{contextOf(leadCompany.name)}</span> : null}{leadCompany ? <span className="rounded-full bg-white/10 px-ds-1.5 py-ds-0.5 text-caption font-bold text-white/85">{leadCompany.underwriter}</span> : null}</div>
          {lead?.link ? <a href={lead.link} target="_blank" rel="noopener noreferrer" className="mt-ds-2 inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-ds-2 text-sm font-bold text-ink-900"><ExternalLink size={14} />원문 열기</a> : null}
        </section>
        <Card padding="normal">
          <SectionHeader title="관련 뉴스 언급" />
          <div className="divide-y divide-ink-100">{newsRows.slice(0, 6).map((item) => {
            const company = findCompany(data, item.company);
            const comp = competitionForCompany(data, item.company);
            return <article key={item.id} className="v6-list-row grid gap-ds-1.5 py-ds-2">
              <div className="flex items-center justify-between gap-ds-2"><p className="truncate text-caption font-bold text-primary-600">{item.company}</p><p className="shrink-0 text-xs text-ink-400 tabular">{item.source} · {item.date}</p></div>
              <h3 className="truncate text-body-1 font-bold text-ink-900">{item.title}</h3>
              <p className="truncate text-caption text-ink-500">{comp ? `${comp.label} ${ratioText(comp.value)}` : company ? contextOf(company.name) : 'IPO 일정 확인 대상'} · {company?.underwriter ?? '원문 확인'}</p>
              {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:underline"><ExternalLink size={14} />열기</a> : null}
            </article>;
          })}</div>
        </Card>
      </div>
    </div>
    <Card padding="normal">
      <SectionHeader title="원문 확인" aside={<span className="text-caption text-ink-500">DART</span>} />
      <DataTable caption="IPO 이슈 원문 확인" columns={[{ key: 'company', label: '기업' }, { key: 'title', label: '공시' }, { key: 'date', label: '접수일' }, { key: 'type', label: '유형' }, { key: 'refund', label: '환불일' }, { key: 'link', label: '원문' }]} rows={data.filings.slice(0, 6).map((f) => ({ id: `issue-filing-${f.id}`, cells: { company: <b>{f.company}</b>, title: f.title, date: f.date, type: <StatusBadge label={f.type} />, refund: refundMetaLabel(findCompany(data, f.company)) || '확인', link: <SourceLink href={f.link} /> } }))} />
    </Card>
  </Shell>;
}

export function MarketEnvironmentPage({ data }: PageProps) {
  const macroRows = data.macro.items.slice(0, 4);
  return <Shell title="시장환경">
    <div className="grid gap-ds-2 md:grid-cols-4">{macroRows.map((item) => <MiniKpi key={item.seriesId} label={item.koreanName} value={item.latestValue === null ? '확인' : `${item.latestValue.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${item.unit}`} tone={item.change && item.change > 0 ? 'amber' : 'blue'} />)}</div>
    <DataTable caption="시장 참고지표" columns={[{ key: 'name', label: '지표' }, { key: 'value', label: '최근값' }, { key: 'date', label: '기준일' }, { key: 'change', label: '변동' }]} rows={macroRows.map((item) => ({ id: item.seriesId, cells: { name: <b>{item.koreanName}</b>, value: item.latestValue === null ? '확인' : `${item.latestValue.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${item.unit}`, date: item.latestDate ?? '확인', change: item.change === null ? '확인' : item.change === 0 ? '보합' : item.change.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) } }))} />
  </Shell>;
}

export function ReportsPage({ data, onAction }: PageProps) { return <NewsPage data={data} onAction={onAction} onTabChange={() => undefined} />; }

export function AiPage({ data, onAction, savedFilingIds = [], onFilingSave }: PageProps) {
  const filingRows = data.filings.slice(0, 9);
  const first = filingRows[0];
  const firstCompany = first ? findCompany(data, first.company) : undefined;
  return <Shell title="원문 일정"><span className="sr-only">공시 추출</span>
    <section className="v6-block v6-delay-0 rounded-2xl border border-ink-900 bg-ink-900 p-ds-3 text-white shadow-popover">
      <div className="grid gap-ds-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div><p className="text-caption text-primary-400">DART 원문 기준</p><h1 className="mt-ds-0.5 text-heading-1 text-white">기업별 원문 일정</h1><p className="mt-ds-1 text-[13px] text-white/60">{first?.company ?? 'IPO'} · {firstCompany ? contextOf(firstCompany.name) : '일정 확인'} · 오늘 09:30 기준</p></div>
        {first ? <div className="rounded-lg bg-white/10 p-ds-2"><p className="text-caption text-white/60">먼저 확인</p><strong className="mt-ds-0.5 block truncate text-[20px] text-white">{first.company}</strong><span className="mt-ds-0.5 block truncate text-[13px] text-white/70">{first.title} · {first.date}</span></div> : null}
      </div>
    </section>
    <div className="grid gap-ds-3 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card padding="normal">
        <SectionHeader title="원문 확인 큐" />
        <div className="divide-y divide-ink-100">{filingRows.map((filing) => <FilingQueueItem key={`ai-list-${filing.id}`} filing={filing} company={findCompany(data, filing.company)} saved={savedFilingIds.includes(filing.id)} onSave={() => onFilingSave?.(filing.id)} />)}</div>
      </Card>
      <div className="grid gap-ds-2 lg:grid-cols-2">
        {filingRows.map((filing) => <ExtractResultCard key={`ai-card-${filing.id}`} filing={filing} company={findCompany(data, filing.company)} saved={savedFilingIds.includes(filing.id)} onSave={() => onFilingSave?.(filing.id)} onOpen={() => onAction(`${filing.company} 원문 확인`)} />)}
      </div>
    </div>
  </Shell>;
}

export function AlertsPage({ data, onAction }: PageProps) { return <Shell title="청약 알림"><AlertListCard data={data} onOpen={() => onAction('청약 알림')} limit={10} /></Shell>; }

export function FavoritesPage({ data, onTabChange, savedFilingIds = [], onFilingSave }: PageProps) {
  const saved = data.filings.filter((filing) => savedFilingIds.includes(filing.id));
  return <Shell title="저장 공시">
    {saved.length ? <DataTable caption="저장 공시 표" columns={[{ key: 'company', label: '기업' }, { key: 'title', label: '공시' }, { key: 'date', label: '일자' }, { key: 'type', label: '상태' }, { key: 'remove', label: '관리' }]} rows={saved.map((filing) => ({ id: `saved-${filing.id}`, cells: { company: <b>{filing.company}</b>, title: filing.title, date: filing.date, type: <StatusBadge label={filing.type} />, remove: <Button variant="secondary" onClick={() => onFilingSave?.(filing.id)} className="h-8 px-3">해제</Button> } }))} /> : <EmptyState title="저장 공시 없음" actionLabel="원문 일정 보기" onAction={() => onTabChange('ai')} icon={FileSearch} />}
  </Shell>;
}

export function MemoPage({ onTabChange }: PageProps) {
  return <Shell title="내 메모"><EmptyState title="작성 메모 없음" actionLabel="기업 보기" onAction={() => onTabChange('companies')} icon={PencilLine} /></Shell>;
}

export function SettingsPage({ data }: PageProps) { return <Shell title="데이터 출처">
  <DataTable caption="데이터 출처 표" columns={[{ key: 'name', label: '항목' }, { key: 'value', label: '내용' }, { key: 'check', label: '확인' }]} rows={[{ id: 'ipo', cells: { name: 'IPO 일정', value: `${data.companies.length}개 기업`, check: '캘린더' } }, { id: 'filing', cells: { name: '공시', value: `${data.filings.length}건`, check: '원문' } }, { id: 'news', cells: { name: '뉴스', value: `${data.news.length}건`, check: '목록' } }, { id: 'report', cells: { name: '브리핑', value: `${data.reports.length}건`, check: '이슈' } }, { id: 'risk', cells: { name: '확인 순서', value: '공시 원문 우선', check: '필수' } }]} />
</Shell>; }
