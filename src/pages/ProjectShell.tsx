import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmptyState } from '../components/common/ui';
import { NAV_ITEMS } from '../data/navigation';
import { useProjectData } from '../data/normalize';
import { HomePage } from './HomePage';
import { WatchPage, CompaniesPage, FilingsPage, CalendarPage, TimelinePage, NewsPage, MarketEnvironmentPage, ReportsPage, AiPage, AlertsPage, FavoritesPage, MemoPage, SettingsPage } from './tabs/SangTabs';

const VALID_TABS = NAV_ITEMS.map((item) => item.id);

function formatActionStamp(value?: string | null): string {
  if (!value) return '오늘 09:30 기준';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ').replace('+09:00', '').slice(5, 16) + ' 기준';
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')} 기준`;
}


function readHashTab(): string {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return 'home';
  const params = new URLSearchParams(raw.includes('=') ? raw : `tab=${raw}`);
  const next = params.get('tab') ?? 'home';
  return VALID_TABS.includes(next) ? next : 'home';
}

export function ProjectShell() {
  const [tab, setTab] = useState<string>(() => readHashTab());
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [liveText, setLiveText] = useState('오늘 09:30 기준');
  const [watchCompanyIds, setWatchCompanyIds] = useState<string[]>([]);
  const [savedFilingIds, setSavedFilingIds] = useState<string[]>([]);
  const data = useProjectData(reloadKey);

  useEffect(() => {
    if (liveText === '오늘 09:30 기준' && data.actionUpdatedAt) setLiveText(formatActionStamp(data.actionUpdatedAt));
  }, [data.actionUpdatedAt, liveText]);

  useEffect(() => {
    const syncHash = () => setTab(readHashTab());
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const updateTab = (next: string) => {
    if (!VALID_TABS.includes(next)) return;
    const params = new URLSearchParams();
    params.set('tab', next);
    window.history.replaceState(null, '', `#${params.toString()}`);
    setTab(next);
  };

  const toggleWatchCompany = (id: string) => {
    setWatchCompanyIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setLiveText('관심기업 반영');
  };

  const toggleSavedFiling = (id: string) => {
    setSavedFilingIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setLiveText('저장 공시 반영');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((value) => value + 1);
    setLiveText(formatActionStamp(data.actionUpdatedAt));
    window.setTimeout(() => setRefreshing(false), 520);
  };

  const dataReady = data.sourceLoaded;
  const canRenderPanel = dataReady || tab === 'market';

  const Panel = useMemo(() => ({ home: HomePage, companies: CompaniesPage, calendar: CalendarPage, news: NewsPage, ai: AiPage, market: MarketEnvironmentPage, watch: WatchPage, filings: FilingsPage, timeline: TimelinePage, reports: ReportsPage, alerts: AlertsPage, favorites: FavoritesPage, memo: MemoPage, settings: SettingsPage })[tab] ?? HomePage, [tab]);

  return (
    <AppLayout kind="gnb" appName="상장노트" source={data.dataMode === 'actions' ? '최근 저장 기준' : 'DART 업데이트'} tab={tab} navItems={NAV_ITEMS} onTabChange={updateTab} onRefresh={handleRefresh} refreshing={refreshing} liveText={liveText}>
      {canRenderPanel ? <Panel data={data} onTabChange={updateTab} onAction={setLiveText} watchCompanyIds={watchCompanyIds} savedFilingIds={savedFilingIds} onWatchToggle={toggleWatchCompany} onFilingSave={toggleSavedFiling} /> : <div className="mx-auto max-w-shell"><EmptyState title="IPO·공시 데이터" actionLabel="새로 고침" onAction={handleRefresh} /></div>}
    </AppLayout>
  );
}
