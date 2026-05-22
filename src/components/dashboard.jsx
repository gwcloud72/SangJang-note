import { useEffect, useMemo, useState } from 'react';
import Header from './sangjang/Header.jsx';
import Toolbar from './sangjang/Toolbar.jsx';
import Summary from './sangjang/Summary.jsx';
import IpoTable from './sangjang/IpoTable.jsx';
import MonthChart from './sangjang/MonthChart.jsx';
import DisclosurePanel from './sangjang/DisclosurePanel.jsx';
import ReportLines from './sangjang/ReportLines.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { readHashState, writeHashState } from '../hooks/useHashFilters.js';
import { useIpoData } from '../hooks/useIpoDashboardData.js';
import { DEFAULT_FILTERS, filterItems, hasActiveFilters, sortItems } from '../lib/dashboardFilters.js';
import { buildMonthBars, getReferenceDate, getStats } from '../lib/ipoData.js';

export default function Dashboard() {
  const initial = useMemo(readHashState, []);
  const [tab, setTab] = useState(initial.tab);
  const [filters, setFilters] = useState(initial.filters);
  const { items, reportLines, updatedAt, isLive } = useIpoData();
  const referenceDate = useMemo(() => getReferenceDate(items), [items]);
  const markets = useMemo(() => [...new Set(items.map((item) => item.market).filter(Boolean))], [items]);
  const filtered = useMemo(() => sortItems(filterItems(items, filters, referenceDate), filters.sort), [items, filters, referenceDate]);
  const favorites = useFavorites([]);
  const visible = tab === 'watch' ? filtered.filter((item) => favorites.has(item.id)) : filtered;
  const stats = useMemo(() => getStats(filtered), [filtered]);
  const { bars, currentLabel } = useMemo(() => buildMonthBars(filtered, referenceDate), [filtered, referenceDate]);
  const reset = () => setFilters(DEFAULT_FILTERS);
  const showAllSchedules = () => {
    setTab('schedule');
    setFilters(DEFAULT_FILTERS);
  };
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const canReset = useMemo(() => hasActiveFilters(filters), [filters]);

  useEffect(() => {
    const update = () => {
      const next = readHashState();
      setTab(next.tab);
      setFilters(next.filters);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => writeHashState(tab, filters), [tab, filters]);

  const tableTitle = tab === 'watch' ? '관심기업' : tab === 'schedule' ? 'IPO 일정 전체' : '이번 달 일정';
  const toolbar = <Toolbar filters={filters} setFilter={setFilter} reset={reset} canReset={canReset} markets={markets} resultCount={visible.length} dataSourceLabel={isLive ? '실데이터' : '수집 대기'} />;

  const renderContent = () => {
    if (tab === 'filings') {
      return (
        <div className="grid gap-4">
          <DisclosurePanel onReset={reset} items={visible} variant="wide" />
          <ReportLines lines={reportLines.slice(0, 3)} compact />
        </div>
      );
    }

    if (tab === 'market') {
      return (
        <div className="grid gap-4">
          <MonthChart onReset={reset} bars={bars} currentLabel={currentLabel} items={filtered} variant="wide" />
          <ReportLines lines={reportLines} variant="document" title="시장 흐름" eyebrow="리포트" />
        </div>
      );
    }

    if (tab === 'watch') {
      return (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
          <IpoTable rows={visible} favorites={favorites} reset={reset} canReset={canReset} title={tableTitle} emptyLabel="저장한 관심기업이 없습니다." onEmptyAction={showAllSchedules} emptyActionLabel="전체 일정 보기" />
          <div className="min-w-0 space-y-4 lg:self-start">
            <MonthChart onReset={reset} bars={bars} currentLabel={currentLabel} items={filtered} compact />
            <DisclosurePanel onReset={reset} items={visible.slice(0, 4)} compact />
          </div>
        </div>
      );
    }

    return (
      <>
        <Summary stats={stats} items={filtered} referenceDate={referenceDate} />
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <MonthChart onReset={reset} bars={bars} currentLabel={currentLabel} items={filtered} featured />
          <ReportLines lines={reportLines.slice(0, 3)} title="AI 일정 리포트" eyebrow="AI 리포트" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.22fr_0.78fr]">
          <div className="min-w-0">
            <IpoTable rows={visible} favorites={favorites} reset={reset} canReset={canReset} title={tableTitle} onEmptyAction={showAllSchedules} emptyActionLabel="전체 일정 보기" />
          </div>
          <DisclosurePanel onReset={reset} items={visible.slice(0, 4)} compact />
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4 text-slate-950 md:px-0 md:py-8">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-white">본문 바로가기</a>
      <div className="mx-auto max-w-[1120px] overflow-hidden rounded-[24px] bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200 md:rounded-[26px]">
        <Header tab={tab} setTab={setTab} updatedAt={updatedAt} />
        <main id="main-content" className="space-y-3 px-4 pt-4 pb-[140px] md:space-y-4 md:p-6">
          {toolbar}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
