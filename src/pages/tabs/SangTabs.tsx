import { useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, ExternalLink, FileSearch, Newspaper, PencilLine } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { BottomWidgetPanel, Button, Card, DataTable, EmptyState, FilterChips, SearchField, SectionHeader, StatsStrip, StatusBadge } from '../../components/common/ui';
import { CalendarCard, CompanyCard, DayCard, DisclaimerBanner, IPOCalendar, StepCard, formatDateFallback } from '../../components/feature/sang';
import type { SangData } from '../../data/normalize';

interface PageProps { data: SangData; onTabChange: (tab: string) => void; onAction: (text: string) => void; }
function Shell({ title, children, data, onAction, compact = false }: { title: string; children: ReactNode; data: SangData; onAction: (text: string) => void; warning?: boolean; compact?: boolean }) { return <div className="space-y-ds-3"><SectionHeader title={title} />{children}<DisclaimerBanner /><BottomWidgetPanel widgets={data.widgets} onAction={onAction} compact={compact} /></div>; }

function LinkedDisclosureList({ data, onAction, limit = 6 }: { data: SangData; onAction: (text: string) => void; limit?: number }) {
  return <DataTable caption="관련 공시 목록" columns={[{ key: 'company', label: '기업' }, { key: 'title', label: '공시' }, { key: 'date', label: '일자' }, { key: 'type', label: '구분' }, { key: 'link', label: '원문' }]} rows={data.filings.slice(0, limit).map((filing) => ({ id: `linked-${filing.id}`, cells: { company: <b>{filing.company}</b>, title: filing.title, date: filing.date, type: <StatusBadge label={filing.type} />, link: <Button variant="secondary" onClick={() => onAction(`${filing.company} 원문`)} className="h-8 px-3"><ExternalLink size={14} />확인</Button> } }))} />;
}

function uniqueCompanies(companies: SangData['companies']): SangData['companies'] {
  return Array.from(new Map(companies.map((company) => [company.name, company])).values());
}

function buildWatchlist(companies: SangData['companies'], limit = 8): SangData['companies'] {
  return uniqueCompanies([...companies.filter((company) => company.bookmarked), ...companies]).slice(0, limit);
}

export function WatchPage({ data, onAction }: PageProps) {
  const watchlist = buildWatchlist(data.companies);
  const watchMetrics = [
    { label: '관심기업', value: `${watchlist.length}건`, sub: '저장 기업' },
    { label: '수요예측', value: `${watchlist.filter((company) => company.status === '수요예측').length}건`, sub: '가장 가까운 일정' },
    { label: '청약', value: `${watchlist.filter((company) => company.status === '청약').length}건`, sub: '청약 확인' },
    { label: '상장', value: `${watchlist.filter((company) => company.status === '상장').length}건`, sub: '상장 예정' },
  ];
  return <Shell title="관심기업" data={data} onAction={onAction}>
    <StatsStrip stats={watchMetrics} compact />
    <div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{watchlist.map((company) => <CompanyCard key={company.id} company={company} onToggle={() => onAction(`${company.name} 저장`)} />)}</div>
    <DataTable caption="관심기업 일정 표" columns={[{ key: 'company', label: '기업' }, { key: 'underwriter', label: '주관사' }, { key: 'date', label: '일정' }, { key: 'status', label: '상태' }, { key: 'memo', label: '메모' }]} rows={watchlist.slice(0, 8).map((company) => ({ id: `watch-${company.id}`, cells: { company: <b>{company.name}</b>, underwriter: company.underwriter, date: formatDateFallback(company.date), status: <StatusBadge label={company.status} />, memo: company.memo } }))} />
  </Shell>;
}

export function CompaniesPage({ data, onAction }: PageProps) { const [q, setQ] = useState(''); const [status, setStatus] = useState('전체'); const list = data.companies.filter((c) => status === '전체' || c.status === status).filter((c) => c.name.includes(q) || c.underwriter.includes(q) || q === ''); return <Shell title="기업 목록" data={data} onAction={onAction}><div className="grid gap-ds-2 lg:grid-cols-auto-action"><SearchField value={q} onChange={setQ} placeholder="기업명·주관사 검색" /><FilterChips items={['전체', '수요예측', '청약', '상장', '예비심사']} active={status} onChange={setStatus} /></div><DataTable caption="기업 목록 표" columns={[{ key: 'company', label: '기업' }, { key: 'underwriter', label: '주관사' }, { key: 'date', label: '일정' }, { key: 'status', label: '상태' }]} rows={list.map((c) => ({ id: c.id, cells: { company: <b>{c.name}</b>, underwriter: c.underwriter, date: formatDateFallback(c.date), status: <StatusBadge label={c.status} /> } }))} /></Shell>; }

export function FilingsPage({ data, onAction }: PageProps) { const [q, setQ] = useState(''); const [status, setStatus] = useState('전체'); const list = data.filings.filter((f) => status === '전체' || f.type === status).filter((f) => f.company.includes(q) || f.title.includes(q) || q === ''); return <Shell title="공시 검색" data={data} onAction={onAction} warning>
  <div className="grid gap-ds-2 lg:grid-cols-auto-action"><SearchField value={q} onChange={setQ} placeholder="공시명·기업명 검색" /><FilterChips items={['전체', '수요예측', '청약', '상장', '예비심사']} active={status} onChange={setStatus} /></div>
  <div className="grid gap-ds-2 xl:grid-cols-main-340">
    <DataTable caption="공시 검색 결과" columns={[{ key: 'company', label: '기업' }, { key: 'title', label: '공시명' }, { key: 'date', label: '접수일' }, { key: 'type', label: '유형' }, { key: 'link', label: '원문' }]} rows={list.slice(0, 12).map((f) => ({ id: f.id, cells: { company: <b>{f.company}</b>, title: f.title, date: f.date, type: <StatusBadge label={f.type} />, link: <Button variant="secondary" onClick={() => onAction(`${f.company} 원문`)} className="h-8 px-3">확인</Button> } }))} />
    <Card padding="normal"><SectionHeader title="최근 공시" action="일정" onAction={() => onAction('일정 캘린더')} /><div className="space-y-2">{data.filings.slice(0, 5).map((filing) => <button type="button" key={`recent-${filing.id}`} onClick={() => onAction(`${filing.company} 확인`)} className="w-full rounded-md bg-ink-50 px-ds-2 py-ds-1 text-left hover:bg-primary-50"><p className="truncate text-sm font-bold text-ink-900">{filing.company}</p><p className="mt-ds-0.5 truncate text-xs text-ink-500">{filing.title}</p></button>)}</div></Card>
  </div>
</Shell>; }

export function CalendarPage({ data, onAction }: PageProps) { return <Shell title="일정 캘린더" data={data} onAction={onAction}><div className="grid gap-ds-2 xl:grid-cols-timeline-side"><IPOCalendar companies={data.companies} onSelect={(c) => onAction(`${c.name} 일정`)} /><Card padding="normal"><SectionHeader title="일정 리스트" action="타임라인" onAction={() => onAction('타임라인')} /><div className="grid gap-ds-1">{data.companies.slice(0, 8).map((company) => <CalendarCard key={company.id} company={company} onOpen={() => onAction(`${company.name} 열기`)} />)}</div></Card></div><StatsStrip stats={data.metrics} compact /></Shell>; }

export function TimelinePage({ data, onAction }: PageProps) { return <Shell title="타임라인" data={data} onAction={onAction}><div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{data.companies.slice(0, 8).map((company) => <DayCard key={company.id} company={company} onOpen={() => onAction(`${company.name} 타임라인`)} />)}</div><Card padding="normal"><SectionHeader title="IPO 흐름" /><HorizontalBarChart data={data.companies.slice(0, 6).map((company) => { const dday = Number(company.dday.replace(/[^0-9]/g, '')); return { name: company.short, value: Number.isFinite(dday) && dday > 0 ? dday : 1 }; })} /></Card></Shell>; }

export function NewsPage({ data, onAction }: PageProps) {
  return <Shell title="뉴스" data={data} onAction={onAction}>
    <div className="grid gap-ds-2 xl:grid-cols-side-320">
      <Card padding="normal">
        <SectionHeader title="IPO 뉴스 흐름" action="공시 검색" onAction={() => onAction('공시 검색')} />
        <div className="divide-y divide-ink-100">
          {data.news.slice(0, 10).map((item) => <article key={item.id} className="flex items-start gap-ds-2 py-4">
            <div className="w-16 shrink-0">
              <p className="text-caption font-medium text-primary-600">{item.source}</p>
              <p className="mt-ds-0.5 text-xs text-ink-400 tabular">{item.date}</p>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-body-1 font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-ds-0.5 truncate text-sm text-ink-500">{item.summary}</p>
            </div>
            {item.link ? <Button variant="secondary" onClick={() => onAction(item.title)} className="h-8 shrink-0 px-3"><ExternalLink size={14} />확인</Button> : null}
          </article>)}
        </div>
      </Card>
      <Card padding="normal">
        <SectionHeader title="기업별 이슈" action="관심기업" onAction={() => onAction('관심기업')} />
        <div className="divide-y divide-ink-100">{data.news.slice(0, 5).map((item, index) => <button type="button" key={`${item.id}-issue`} onClick={() => onAction(`${item.company} 확인`)} className="flex w-full items-center justify-between gap-ds-2 py-3 text-left hover:bg-ink-50"><span className="truncate text-sm text-ink-900"><b>{index + 1}.</b> {item.company}</span><span className="text-xs text-ink-400 tabular">{item.date}</span></button>)}</div>
      </Card>
    </div>
  </Shell>;
}


function MacroLineChart({ data, unit, label }: { data: { date: string; value: number }[]; unit: string; label: string }) {
  const points = data.slice(-36).filter((item) => Number.isFinite(item.value));
  const chartRows = points.map((item) => ({ date: item.date.slice(5), value: item.value }));
  return <div className="h-full min-h-[200px] w-full" role="img" aria-label={`${label} 최근 흐름`}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartRows} margin={{ top: 12, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9E9E9E' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9E9E9E' }} tickLine={false} axisLine={false} domain={["dataMin", "dataMax"]} tickFormatter={(value) => macroValueLabel(Number(value), unit)} width={58} />
        <Line type="monotone" dataKey="value" stroke="#1971C2" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

const macroValueLabel = (value: number | null, unit: string) => {
  if (value === null) return '확인 예정';
  const formatted = value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return unit === '%' ? `${formatted}%` : formatted;
};

const macroChangeLabel = (change: number | null, changeRate: number | null, unit: string) => {
  if (change === null) return '이전값 확인 중';
  if (change === 0) return '보합';
  const sign = change > 0 ? '+' : '';
  const value = unit === '%' ? `${sign}${change.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%p` : `${sign}${change.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}`;
  const rate = changeRate === null ? '' : ` (${changeRate > 0 ? '+' : ''}${changeRate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%)`;
  return `${value}${rate}`;
};

const macroChangeClass = (change: number | null) => {
  if (change === null || change === 0) return 'bg-flat-bg text-flat';
  return change > 0 ? 'bg-up-bg text-up' : 'bg-down-bg text-down';
};

export function MarketEnvironmentPage({ data, onAction }: PageProps) {
  const [selectedId, setSelectedId] = useState(data.macro.items[0]?.seriesId ?? 'FEDFUNDS');
  const selected = data.macro.items.find((item) => item.seriesId === selectedId) ?? data.macro.items[0];
  const reportById = new Map(data.macro.reports.map((item) => [item.seriesId, item]));
  const chartData = selected?.observations ?? [];
  const hasMacro = data.macro.items.length > 0;

  return <Shell title="시장환경" data={data} onAction={onAction} compact>
    <Card padding="normal" interactive={false}>
      <div className="flex flex-col gap-ds-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 text-keep">
          <p className="text-caption font-semibold text-primary-600">시장 참고지표</p>
          <h1 className="mt-ds-0.5 text-heading-1 text-ink-900">시장환경</h1>
          <p className="mt-ds-0.5 text-body-2 leading-6 text-ink-500">IPO 일정을 볼 때 참고할 수 있는 미국 주요 경제지표입니다.</p>
        </div>
        <div className="flex shrink-0 items-center gap-ds-1 rounded-md bg-ink-50 px-ds-2 py-ds-1 text-caption text-ink-500">
          <Activity size={15} className="text-primary-600" />
          <span className="tabular">{data.macro.updatedAt ? data.macro.updatedAt.slice(0, 10) : '업데이트 예정'}</span>
        </div>
      </div>
    </Card>

    {hasMacro ? <div className="grid gap-ds-2 lg:grid-cols-2">
      {data.macro.items.slice(0, 4).map((item) => {
        const report = reportById.get(item.seriesId);
        return <Card key={item.seriesId} padding="normal" selected={selected?.seriesId === item.seriesId} as="button" onClick={() => setSelectedId(item.seriesId)} className="w-full text-left">
          <div className="flex items-start justify-between gap-ds-2">
            <div className="min-w-0 text-keep">
              <h3 className="text-heading-3 text-ink-900">{report?.koreanName || item.koreanName}</h3>
              <p className="mt-ds-0.5 text-[12px] font-medium text-ink-400">{item.seriesId}</p>
            </div>
            <span className={`shrink-0 rounded-sm px-ds-1 py-ds-0.5 text-caption font-semibold tabular ${macroChangeClass(item.change)}`}>{macroChangeLabel(item.change, item.changeRate, item.unit)}</span>
          </div>
          <p className="mt-ds-2 text-price-lg text-ink-900 tabular">{macroValueLabel(item.latestValue, item.unit)}</p>
          <p className="mt-ds-0.5 text-caption text-ink-500">기준일 {item.latestDate ?? '확인 예정'}</p>
          <p className="mt-ds-2 max-h-12 overflow-hidden text-sm leading-6 text-ink-600 text-keep">{report?.plainSummary || '요약 확인 예정'}</p>
          <p className="mt-ds-1 max-h-12 overflow-hidden text-sm leading-6 text-ink-500 text-keep">{report?.ipoContext || '시장 참고 설명을 확인 중입니다.'}</p>
        </Card>;
      })}
    </div> : <EmptyState title="시장 참고지표 확인 필요" description="최신 지표 확인 후 반영됩니다." icon={AlertTriangle} />}

    <Card padding="normal" interactive={false}>
      <SectionHeader title="최근 흐름" description="4개 지표 중 하나를 선택해 최근 흐름만 확인합니다." />
      {hasMacro && selected ? <div className="space-y-ds-2">
        <FilterChips items={data.macro.items.map((item) => item.koreanName)} active={selected.koreanName} onChange={(label) => setSelectedId(data.macro.items.find((item) => item.koreanName === label)?.seriesId ?? selected.seriesId)} />
        <div className="h-chart min-w-0 rounded-lg border border-ink-200 bg-ink-50 p-ds-2">
          <MacroLineChart data={chartData} unit={selected.unit} label={selected.koreanName} />
        </div>
      </div> : <EmptyState title="시장 참고지표 확인 필요" description="최신 지표 확인 후 반영됩니다." compact icon={AlertTriangle} />}
    </Card>

  </Shell>;
}

export function ReportsPage({ data, onAction }: PageProps) { return <Shell title="리포트" data={data} onAction={onAction} warning>
  <div className="grid gap-ds-2 xl:grid-cols-main-420">
    <div className="grid gap-ds-2 lg:grid-cols-2">{data.reports.slice(0, 6).map((report, index) => <Card key={report.id} className="p-ds-3"><span className="inline-flex items-center gap-1 rounded bg-primary-100 px-2 py-1 text-xs font-semibold text-primary-600"><Newspaper size={13} />{data.companies[index]?.name ?? '기업'}</span><h3 className="mt-ds-2 font-bold text-ink-900">{report.title}</h3><p className="mt-ds-2 text-sm leading-6 text-ink-500">{report.summary}</p><Button variant="secondary" onClick={() => onAction(report.title)} className="mt-ds-2">확인</Button></Card>)}</div>
    <LinkedDisclosureList data={data} onAction={onAction} limit={6} />
  </div>
</Shell>; }

export function AiPage({ data, onAction }: PageProps) { return <Shell title="공시 요약" data={data} onAction={onAction} warning>
  <div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{data.filings.slice(0, 8).map((filing) => <Card key={filing.id} className="p-ds-3"><StatusBadge label={filing.type} /><h3 className="mt-ds-2 font-bold text-ink-900">{filing.company}</h3><ul className="mt-ds-2 space-y-2 text-sm text-ink-500"><li>· {filing.title}</li><li>· 일정과 주관사 확인</li><li>· 원문 확인 후 비교</li></ul><Button variant="secondary" onClick={() => onAction(`${filing.company} 원문`)} className="mt-ds-2 w-full"><FileSearch size={15} />원문 확인</Button></Card>)}</div>
</Shell>; }

export function AlertsPage({ data, onAction }: PageProps) { const [active, setActive] = useState<string[]>([]); return <Shell title="청약 마감 알림" data={data} onAction={onAction}><div className="grid gap-ds-2 lg:grid-cols-3">{data.companies.slice(0, 6).map((company) => <Card key={company.id} className={`p-ds-3 ${active.includes(company.id) ? 'border-primary-400 bg-primary-50' : ''}`}><div className="flex items-center justify-between"><b>{company.name}</b><button type="button" aria-pressed={active.includes(company.id)} onClick={() => setActive((list) => list.includes(company.id) ? list.filter((id) => id !== company.id) : [...list, company.id])} className="text-xs font-semibold text-primary-600">{active.includes(company.id) ? '켜짐' : '꺼짐'}</button></div><p className="mt-ds-1 text-sm text-ink-500">{company.date} {company.status}</p></Card>)}</div></Shell>; }

export function FavoritesPage({ data, onAction }: PageProps) { const favorites = buildWatchlist(data.companies, 6); return <Shell title="즐겨찾기" data={data} onAction={onAction}><div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{favorites.map((company) => <CompanyCard key={company.id} company={company} onToggle={() => onAction(`${company.name} 저장`)} />)}</div></Shell>; }

export function MemoPage({ data, onAction }: PageProps) { const [filter, setFilter] = useState('전체'); const memoRows = data.companies.slice(0, 8); return <Shell title="메모" data={data} onAction={onAction}>
  <FilterChips items={['전체', '수요예측', '청약', '상장']} active={filter} onChange={setFilter} />
  <div className="grid gap-ds-2 xl:grid-cols-main-360">
    <div className="grid gap-ds-2 lg:grid-cols-2">{memoRows.filter((company) => filter === '전체' || company.status === filter).map((company) => <Card key={company.id} className="p-ds-3"><div className="flex items-start justify-between gap-ds-2"><div><h3 className="font-bold text-ink-900">{company.name}</h3><p className="mt-ds-0.5 text-xs text-ink-500">{company.date} · {company.underwriter}</p></div><StatusBadge label={company.status} /></div><p className="mt-ds-2 text-sm leading-6 text-ink-500">{company.memo}</p><Button variant="secondary" onClick={() => onAction(`${company.name} 메모`)} className="mt-ds-2"><PencilLine size={15} />수정</Button></Card>)}</div>
    <Card padding="normal"><SectionHeader title="최근 공시 연결" action="공시 검색" onAction={() => onAction('공시 검색')} /><div className="space-y-2">{data.filings.slice(0, 4).map((filing) => <button type="button" key={`memo-${filing.id}`} onClick={() => onAction(`${filing.company} 공시`)} className="w-full rounded-md bg-ink-50 px-ds-2 py-ds-1 text-left hover:bg-primary-50"><p className="truncate text-sm font-bold text-ink-900">{filing.company}</p><p className="mt-ds-0.5 truncate text-xs text-ink-500">{filing.title}</p></button>)}</div></Card>
  </div>
</Shell>; }

export function SettingsPage({ data, onAction }: PageProps) { return <Shell title="출처" data={data} onAction={onAction} warning compact>
  <div className="grid gap-ds-2 xl:grid-cols-main-360">
    <DataTable caption="데이터 출처 표" columns={[{ key: 'name', label: '항목' }, { key: 'value', label: '내용' }, { key: 'check', label: '확인' }]} rows={[{ id: 'ipo', cells: { name: 'IPO 일정', value: `${data.companies.length}개 기업`, check: '캘린더' } }, { id: 'filing', cells: { name: '공시', value: `${data.filings.length}건`, check: '원문' } }, { id: 'news', cells: { name: '뉴스', value: `${data.news.length}건`, check: '목록' } }, { id: 'report', cells: { name: '리포트', value: `${data.reports.length}건`, check: '요약' } }, { id: 'memo', cells: { name: '메모', value: `${data.companies.filter((company) => company.memo && company.memo !== '확인 메모를 추가하세요.').length}건`, check: '수정' } }, { id: 'risk', cells: { name: '확인 순서', value: '공시 원문 우선', check: '필수' } }]} />
    <div className="grid gap-ds-2"><StepCard number={1} label="기업 확인" desc="관심기업과 일정 상태를 먼저 확인합니다." onClick={() => onAction('기업 확인')} /><StepCard number={2} label="공시 원문" desc="공시 검색에서 원문 항목을 확인합니다." onClick={() => onAction('공시 원문')} /><StepCard number={3} label="일정 비교" desc="캘린더와 타임라인을 함께 봅니다." onClick={() => onAction('일정 비교')} /></div>
  </div>
</Shell>; }
