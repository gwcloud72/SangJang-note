import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Bell, CalendarDays, CalendarOff, ExternalLink, FileSearch } from 'lucide-react';
import { Button, Card, SectionHeader, StatusBadge } from '../components/common/ui';
import { CalendarCard, CompanyCard, DisclaimerBanner, IPOCalendar } from '../components/feature/sang';
import type { SangData } from '../data/normalize';

interface PageProps { data: SangData; onTabChange: (tab: string) => void; onAction: (text: string) => void; watchCompanyIds?: string[]; onWatchToggle?: (id: string) => void; }

const DART_CALENDAR_URL = 'https://dart.fss.or.kr/dsac008/main.do';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function useCountUp(target: number, duration = 800) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(typeof window === 'undefined' || reduced ? target : 0);
  const animated = useRef(false);
  useEffect(() => {
    if (reduced || animated.current) {
      setValue(target);
      return;
    }
    animated.current = true;
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);
  return value;
}

function uniqueCompanies(companies: SangData['companies']): SangData['companies'] {
  return Array.from(new Map(companies.map((company) => [company.name, company])).values());
}

function disclosureHref(link?: string) {
  return link && /^https?:\/\//.test(link) ? link : DART_CALENDAR_URL;
}

function basisLabel(data: SangData): string {
  const value = data.actionUpdatedAt;
  if (!value) return '오늘 09:30 기준';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ').replace('+09:00', '').slice(5, 16) + ' 기준';
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')} 기준`;
}

function KpiTile({ label, count, suffix = '건', icon, accent = 'primary' }: { label: string; count: number; suffix?: string; icon: ReactNode; accent?: 'primary' | 'ink' }) {
  const value = useCountUp(count);
  if (count <= 0) return null;
  const accentClass = accent === 'primary' ? 'bg-primary-50 text-primary-600' : 'bg-ink-100 text-ink-700';
  return <div className="v6-card-hover flex items-center gap-ds-2 rounded-lg border border-ink-200 bg-white p-ds-3 shadow-card"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accentClass}`}>{icon}</span><span className="min-w-0"><span className="block text-[11px] text-ink-500">{label}</span><strong className="mt-ds-0.5 block text-[22px] leading-[1.1] text-ink-900 tabular">{value.toLocaleString()}{suffix}</strong></span></div>;
}

function nextAlertRows(data: SangData) {
  return data.alerts.slice(0, 4);
}
function AlertActionRow({ alert, index, onClick }: { alert: SangData['alerts'][number]; index: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`v6-action-row v6-row-delay-${index} grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-ds-2 rounded-md border border-ink-200 bg-white px-ds-2 py-ds-1.5 text-left shadow-card`}>
    <span className="min-w-0"><b className="block truncate text-[15px] text-ink-900">{alert.companyName}</b><span className="block truncate text-[13px] text-ink-500">{alert.actionLabel}</span></span>
    <span className="shrink-0 text-right"><StatusBadge label={alert.stage} /><span className="mt-ds-0.5 block text-[13px] text-ink-500 tabular">{alert.dateLabel}</span></span>
  </button>;
}
function SubscriptionAlertCard({ data, onOpen }: { data: SangData; onOpen: () => void }) {
  const rows = nextAlertRows(data);
  if (!rows.length) return null;
  return <Card padding="normal" className="rounded-lg">
    <SectionHeader title="청약 알림" action="일정" onAction={onOpen} />
    <div className="grid gap-ds-1.5">
      {rows.map((alert) => <button type="button" key={alert.id} onClick={onOpen} className="v6-list-row grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-ds-2 rounded-md bg-ink-50 px-ds-2 py-ds-1.5 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Bell size={16} /></span>
        <span className="min-w-0"><b className="block truncate text-[15px] text-ink-900">{alert.companyName}</b><span className="block truncate text-[13px] text-ink-500">{alert.actionLabel} · {alert.detail}</span></span>
        <span className="text-right"><StatusBadge label={alert.stage} /><span className="mt-ds-0.5 block text-[13px] text-ink-500 tabular">{alert.dateLabel}</span></span>
      </button>)}
    </div>
  </Card>;
}
function FilingTable({ filings, onOpen }: { filings: SangData['filings']; onOpen: () => void }) {
  if (!filings.length) return <IpoNotice type="empty" onAction={onOpen} />;
  return <div className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card">
    <div className="overflow-x-auto">
      <table className="w-full min-w-table border-separate border-spacing-0">
        <caption className="sr-only">오늘 공시 원문 표</caption>
        <thead><tr>{['기업', '공시', '접수일', '구분', '원문'].map((label, index) => <th key={label} scope="col" className={`bg-ink-100 px-ds-2 py-ds-1.5 text-left text-[11px] text-ink-500 ${index === 4 ? 'text-right' : ''}`}>{label}</th>)}</tr></thead>
        <tbody>{filings.map((item) => <tr key={item.id} className="v6-table-row">
          <td className="border-b border-ink-100 px-ds-2 py-ds-2 text-[15px] text-ink-900"><b>{item.company}</b></td>
          <td className="border-b border-ink-100 px-ds-2 py-ds-2 text-[15px] text-ink-700">{item.title}</td>
          <td className="border-b border-ink-100 px-ds-2 py-ds-2 text-[13px] text-ink-500 tabular">{item.date}</td>
          <td className="border-b border-ink-100 px-ds-2 py-ds-2"><StatusBadge label={item.type} /></td>
          <td className="border-b border-ink-100 px-ds-2 py-ds-2 text-right"><a href={disclosureHref(item.link)} target="_blank" rel="noopener noreferrer" onClick={onOpen} className="v6-table-open inline-flex h-8 items-center justify-center gap-ds-0.5 rounded-md border border-ink-200 px-ds-2 text-[13px] text-primary-600"><ExternalLink size={12} />원문 열기</a></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

function IpoSkeleton() {
  return <div className="space-y-ds-2" aria-label="공시 로딩">
    {Array.from({ length: 5 }).map((_, index) => <div key={`ipo-skeleton-${index}`} className="rounded-lg border border-ink-200 bg-white p-ds-3"><div className="h-ds-2 w-2/5 rounded-md ds-skeleton" /><div className="mt-ds-2 h-ds-3 w-4/5 rounded-md ds-skeleton" /></div>)}
  </div>;
}

function IpoNotice({ type, onAction }: { type: 'empty' | 'error'; onAction?: () => void }) {
  const Icon = type === 'empty' ? CalendarOff : AlertCircle;
  const title = type === 'empty' ? '예정된 IPO 일정이 없어요' : '공시를 불러오지 못했어요';
  const action = type === 'empty' ? '기업 보기' : '다시 시도';
  return <div className="rounded-lg border border-ink-200 bg-white p-ds-3 shadow-card">
    <div className="flex items-center gap-ds-2"><Icon className="h-ds-5 w-ds-5 text-ink-300" strokeWidth={1.7} /><div className="min-w-0 flex-1"><h3 className="text-[15px] leading-[1.3] text-ink-900">{title}</h3><p className="mt-ds-0.5 text-[13px] leading-[1.5] text-ink-500">기준 시각 확인</p></div><Button variant="secondary" size="sm" onClick={onAction}>{action}</Button></div>
  </div>;
}

export function HomePage({ data, onTabChange, onAction }: PageProps) {
  const reducedMotion = usePrefersReducedMotion();
  const companies = uniqueCompanies(data.companies);
  const nearest = companies[0];
  const filings = data.filings.slice(0, 5);
  const news = data.news.slice(0, 4);
  const subscribeCount = companies.filter((company) => Boolean(company.subscriptionStart)).length;
  const basis = basisLabel(data);
  const nextAlerts = nextAlertRows(data);
  const stageGlance = ([
    ['청약', companies.filter((company) => company.status === '청약 예정' || company.status === '청약 진행중').length],
    ['수요예측', companies.filter((company) => company.status === '수요예측').length],
    ['예비심사', companies.filter((company) => company.status === '예비심사').length],
    ['상장', companies.filter((company) => company.status === '상장').length],
    ['환불', companies.filter((company) => company.status === '환불일').length],
  ] as const).filter((entry) => entry[1] > 0);

  const handleOpen = () => {
    onAction(basis);
    onTabChange('ai');
  };

  if (!companies.length) {
    return <div className="mx-auto max-w-[1280px]"><IpoNotice type="empty" onAction={() => onTabChange('companies')} /></div>;
  }

  return <div className={`v6-page mx-auto max-w-[1280px] space-y-ds-4 px-0 ${reducedMotion ? 'v6-reduce-motion' : ''}`}>
    <section className="v6-block v6-delay-0 overflow-hidden rounded-lg border border-[#0A0E1A] bg-hero-sang text-white shadow-popover">
      <div className="grid gap-ds-3 p-ds-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col">
          <div>
            <span className="inline-flex rounded-full bg-primary-500 px-ds-2 py-ds-0.5 text-[11px] text-white">IPO TODAY</span>
            <h1 className="mt-ds-2 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-white">오늘 확인할 IPO</h1>
            <p className="mt-ds-1 text-[15px] leading-[1.5] text-white/70">{nearest?.name} · {nearest?.date} · {basis}</p>
            {stageGlance.length ? <div className="mt-ds-3 flex flex-wrap gap-ds-1">{stageGlance.map((entry) => <span key={entry[0]} className="inline-flex items-center gap-ds-0.5 rounded-full bg-white/10 px-ds-2 py-ds-1 text-[13px] text-white/85"><b className="tabular text-white">{entry[1]}</b>{entry[0]}</span>)}</div> : null}
          </div>
          <div className="mt-auto flex flex-wrap gap-ds-1 pt-ds-3"><Button onClick={() => onTabChange('calendar')} rightIcon={<CalendarDays size={16} />}>일정 보기</Button><Button variant="white" onClick={() => onTabChange('ai')} rightIcon={<FileSearch size={16} />}>원문 일정 보기</Button></div>
        </div>
        <div className="v6-block v6-delay-2 self-start rounded-lg bg-white p-ds-3 text-ink-900 shadow-card">
          <div className="flex items-center justify-between gap-ds-2"><div><p className="text-[11px] text-primary-600">청약 알림</p><h2 className="text-[20px] font-bold leading-[1.3] text-ink-900">다음 일정 알림</h2></div><Bell className="text-primary-600" size={22} /></div>
          <div className="mt-ds-2 space-y-ds-1.5">
            {nextAlerts.length ? nextAlerts.map((alert, index) => <AlertActionRow key={alert.id} alert={alert} index={index} onClick={handleOpen} />) : <IpoNotice type="empty" onAction={() => onTabChange('calendar')} />}
          </div>
        </div>
      </div>
    </section>

    <div className="v6-block v6-delay-2 grid gap-ds-2 md:grid-cols-2">
      <KpiTile label="청약 일정" count={subscribeCount} icon={<CalendarDays size={20} />} accent="primary" />
      <KpiTile label="공시 원문" count={companies.length} icon={<FileSearch size={20} />} accent="ink" />
    </div>

    <div className="v6-block v6-delay-3"><SubscriptionAlertCard data={data} onOpen={() => onTabChange('calendar')} /></div>

    <div className="v6-block v6-delay-3 grid items-start gap-ds-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card padding="normal" className="rounded-lg">
        <SectionHeader title="이번 주 일정판" action="일정" onAction={() => onTabChange('calendar')} />
        <div className="grid gap-ds-3 lg:grid-cols-[360px_minmax(0,1fr)]">
          <IPOCalendar companies={data.companies} referenceDate={data.referenceDate} onSelect={() => onTabChange('companies')} compact />
          <div className="grid content-start gap-ds-1.5">
            {companies.slice(0, 7).map((company) => <CalendarCard key={`home-cal-${company.id}`} company={company} onOpen={() => onTabChange('companies')} />)}
          </div>
        </div>
      </Card>
      <Card padding="normal" className="v6-block v6-delay-5 rounded-lg">
        <SectionHeader title="주요 기업" action="기업" onAction={() => onTabChange('companies')} />
        <div className="grid gap-ds-2">{companies.slice(0, 4).map((company) => <CompanyCard key={`home-company-${company.id}`} company={company} compact showWatchButton={false} />)}</div>
      </Card>
    </div>

    <div className="v6-block v6-delay-4 grid items-start gap-ds-3 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card padding="normal" className="rounded-lg">
        <SectionHeader title="공시 원문" action="원문 일정" onAction={() => onTabChange('ai')} />
        {data.sourceLoaded ? <FilingTable filings={filings} onOpen={() => onAction(basis)} /> : <IpoSkeleton />}
      </Card>
      <Card padding="normal" className="rounded-lg">
        <SectionHeader title="IPO 이슈" action="뉴스" onAction={() => onTabChange('news')} />
        <div className="space-y-ds-1.5">
          {news.map((item) => <button type="button" key={item.id} onClick={() => onTabChange('news')} className="v6-list-row grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-ds-1.5 rounded-md bg-ink-50 px-ds-2 py-ds-1.5 text-left"><span className="truncate text-[15px] text-ink-900">{item.company} · {item.title}</span><span className="text-[13px] text-ink-500">{item.date}</span></button>)}
        </div>
      </Card>
    </div>

    <div className="v6-block v6-delay-5"><DisclaimerBanner /></div>
  </div>;
}
