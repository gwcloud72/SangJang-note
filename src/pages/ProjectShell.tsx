import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { EmptyState } from '../components/common/ui';
import { NAV_ITEMS } from '../data/navigation';
import { useProjectData } from '../data/normalize';
import { RightRail } from './RightRail';
import { HomePage } from './HomePage';
import { WatchPage, CompaniesPage, FilingsPage, CalendarPage, TimelinePage, NewsPage, MarketEnvironmentPage, ReportsPage, AiPage, AlertsPage, FavoritesPage, MemoPage, SettingsPage } from './tabs/SangTabs';

const VALID_TABS = NAV_ITEMS.map((item) => item.id);

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
  const [liveText, setLiveText] = useState('최신 정보 표시 중');
  const data = useProjectData(reloadKey);

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

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((value) => value + 1);
    setLiveText('방금 갱신됨');
    window.setTimeout(() => setRefreshing(false), 520);
  };

  const dataReady = data.sourceLoaded && data.companies.length > 0;
  const canRenderPanel = dataReady || tab === 'market';

  const Panel = useMemo(() => ({ home: HomePage, watch: WatchPage, companies: CompaniesPage, filings: FilingsPage, calendar: CalendarPage, timeline: TimelinePage, news: NewsPage, market: MarketEnvironmentPage, reports: ReportsPage, ai: AiPage, alerts: AlertsPage, favorites: FavoritesPage, memo: MemoPage, settings: SettingsPage })[tab] ?? HomePage, [tab]);

  return (
    <AppLayout kind="gnb" appName="상장노트" source="DART 업데이트" tab={tab} navItems={NAV_ITEMS} onTabChange={updateTab} onRefresh={handleRefresh} refreshing={refreshing} liveText={liveText} rightRail={dataReady ? <RightRail data={data} onTabChange={updateTab} /> : undefined}>
      {canRenderPanel ? <Panel data={data} onTabChange={updateTab} onAction={setLiveText} /> : <div className="mx-auto max-w-shell"><EmptyState title="IPO·공시 데이터" description="최신 공시 정보 확인 후 일정과 기업 정보가 표시됩니다." actionLabel="새로 고침" onAction={handleRefresh} /></div>}
    </AppLayout>
  );
}
