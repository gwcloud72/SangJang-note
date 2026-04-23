import { useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import FinderPanel from './components/FinderPanel.jsx';
import ScheduleList from './components/ScheduleList.jsx';
import NoticeCard from './components/NoticeCard.jsx';
import { useIpoData } from './hooks/useIpoData.js';
import { useTheme } from './hooks/useTheme.js';
import { getTodayLabel } from './utils/dates.js';
import { normalizeStatus } from './utils/status.js';

function filterItems(items, keyword, status) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return items.filter((item) => {
    const itemStatus = normalizeStatus(item);
    const haystack = [
      item.companyName,
      item.reportName,
      item.securityType,
      item.offeringMethod,
      Array.isArray(item.underwriters) ? item.underwriters.join(' ') : '',
    ]
      .join(' ')
      .toLowerCase();

    const matchesKeyword = !normalizedKeyword || haystack.includes(normalizedKeyword);
    const matchesStatus = status === 'all' || itemStatus === status;

    return matchesKeyword && matchesStatus;
  });
}

export default function App() {
  const { payload, items, isLoading, error, reload } = useIpoData();
  const { theme, toggleTheme } = useTheme();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');

  const filteredItems = useMemo(() => filterItems(items, keyword, status), [items, keyword, status]);

  const summary = useMemo(() => {
    const openItems = items.filter((item) => normalizeStatus(item) === 'open');
    const upcomingItems = items.filter((item) => normalizeStatus(item) === 'upcoming');
    const closedItems = items.filter((item) => normalizeStatus(item) === 'closed');

    return {
      total: items.length,
      open: openItems.length,
      upcoming: upcomingItems.length,
      closed: closedItems.length,
      source: payload?.metadata?.source || 'empty',
      updatedAt: payload?.metadata?.updatedAt || '',
      warning: payload?.metadata?.warning || payload?.metadata?.notice || '',
    };
  }, [items, payload]);

  return (
    <>
      <Header theme={theme} onThemeToggle={toggleTheme} />
      <main id="top" className="page-shell">
        <Hero summary={summary} isLoading={isLoading} />
        <FinderPanel
          keyword={keyword}
          status={status}
          summary={summary}
          isLoading={isLoading}
          error={error}
          onKeywordChange={setKeyword}
          onStatusChange={setStatus}
          onRefresh={reload}
        />
        <ScheduleList
          items={filteredItems}
          totalCount={items.length}
          todayLabel={getTodayLabel()}
          isLoading={isLoading}
          selectedStatus={status}
        />
        <NoticeCard warning={summary.warning} />
      </main>
    </>
  );
}
