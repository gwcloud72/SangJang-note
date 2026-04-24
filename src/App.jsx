import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import FinderPanel from './components/FinderPanel.jsx';
import ScheduleList from './components/ScheduleList.jsx';
import LatestOfferList from './components/LatestOfferList.jsx';
import DetailModal from './components/DetailModal.jsx';
import NoticeCard from './components/NoticeCard.jsx';
import { useIpoData } from './hooks/useIpoData.js';
import { useTheme } from './hooks/useTheme.js';
import { getTodayLabel } from './utils/dates.js';
import { normalizeStatus } from './utils/status.js';

const SCHEDULE_PAGE_SIZE = 8;
const LATEST_PAGE_SIZE = 6;

const STATUS_PRIORITY = {
  open: 0,
  upcoming: 1,
  unknown: 2,
  closed: 3,
};

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
      item.offerPrice,
      item.offerAmount,
      item.stockCode,
      item.subscriptionCompetitionRate,
      item.demandForecastCompetitionRate,
      item.refundDate,
      item.listingDate,
    ]
      .join(' ')
      .toLowerCase();

    const matchesKeyword = !normalizedKeyword || haystack.includes(normalizedKeyword);
    const matchesStatus = status === 'all' || itemStatus === status;

    return matchesKeyword && matchesStatus;
  });
}

function getRelevantScheduleDate(item, status) {
  if (status === 'open') {
    return item.scheduleEnd || item.scheduleStart || item.receiptDate || '9999-12-31';
  }

  if (status === 'closed') {
    return item.scheduleEnd || item.scheduleStart || item.receiptDate || '';
  }

  return item.scheduleStart || item.scheduleEnd || item.receiptDate || '9999-12-31';
}

function sortItems(items, sortOrder) {
  const next = [...items];

  if (sortOrder === 'latest') {
    return next.sort((a, b) => {
      const aDate = a.receiptDate || a.scheduleStart || a.scheduleEnd || '';
      const bDate = b.receiptDate || b.scheduleStart || b.scheduleEnd || '';

      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return (a.companyName || '').localeCompare(b.companyName || '', 'ko');
    });
  }

  return next.sort((a, b) => {
    const aStatus = normalizeStatus(a);
    const bStatus = normalizeStatus(b);
    const statusOrder = (STATUS_PRIORITY[aStatus] ?? 9) - (STATUS_PRIORITY[bStatus] ?? 9);

    if (statusOrder !== 0) return statusOrder;

    const aDate = getRelevantScheduleDate(a, aStatus);
    const bDate = getRelevantScheduleDate(b, bStatus);

    if (aDate !== bDate) {
      if (aStatus === 'closed' && bStatus === 'closed') {
        return bDate.localeCompare(aDate);
      }

      return aDate.localeCompare(bDate);
    }

    return (a.companyName || '').localeCompare(b.companyName || '', 'ko');
  });
}

function paginate(items, currentPage, pageSize) {
  const startIndex = (currentPage - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}

export default function App() {
  const { payload, items, isLoading, error, reload } = useIpoData();
  const { theme, toggleTheme } = useTheme();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('schedule');
  const [schedulePage, setSchedulePage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [latestPage, setLatestPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredItems = useMemo(() => {
    const filtered = filterItems(items, keyword, status);
    return sortItems(filtered, sortOrder);
  }, [items, keyword, status, sortOrder]);

  const { primaryScheduleItems, closedScheduleItems } = useMemo(() => {
    if (status !== 'all') {
      return {
        primaryScheduleItems: filteredItems,
        closedScheduleItems: [],
      };
    }

    return {
      primaryScheduleItems: filteredItems.filter((item) => normalizeStatus(item) !== 'closed'),
      closedScheduleItems: filteredItems.filter((item) => normalizeStatus(item) === 'closed'),
    };
  }, [filteredItems, status]);

  const latestItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.receiptDate || a.scheduleStart || '';
      const bDate = b.receiptDate || b.scheduleStart || '';

      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return (a.companyName || '').localeCompare(b.companyName || '', 'ko');
    });
  }, [items]);

  useEffect(() => {
    setSchedulePage(1);
    setClosedPage(1);
  }, [keyword, status, sortOrder]);

  useEffect(() => {
    setLatestPage(1);
  }, [items.length]);

  const scheduleTotalPages = Math.max(1, Math.ceil(primaryScheduleItems.length / SCHEDULE_PAGE_SIZE));
  const closedTotalPages = Math.max(1, Math.ceil(closedScheduleItems.length / SCHEDULE_PAGE_SIZE));
  const latestTotalPages = Math.max(1, Math.ceil(latestItems.length / LATEST_PAGE_SIZE));

  useEffect(() => {
    if (schedulePage > scheduleTotalPages) {
      setSchedulePage(scheduleTotalPages);
    }
  }, [schedulePage, scheduleTotalPages]);

  useEffect(() => {
    if (closedPage > closedTotalPages) {
      setClosedPage(closedTotalPages);
    }
  }, [closedPage, closedTotalPages]);

  useEffect(() => {
    if (latestPage > latestTotalPages) {
      setLatestPage(latestTotalPages);
    }
  }, [latestPage, latestTotalPages]);

  const pagedScheduleItems = useMemo(() => {
    return paginate(primaryScheduleItems, schedulePage, SCHEDULE_PAGE_SIZE);
  }, [primaryScheduleItems, schedulePage]);

  const pagedClosedItems = useMemo(() => {
    return paginate(closedScheduleItems, closedPage, SCHEDULE_PAGE_SIZE);
  }, [closedScheduleItems, closedPage]);

  const pagedLatestItems = useMemo(() => {
    return paginate(latestItems, latestPage, LATEST_PAGE_SIZE);
  }, [latestItems, latestPage]);

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

  const todayLabel = getTodayLabel();

  return (
    <>
      <Header theme={theme} onThemeToggle={toggleTheme} />
      <main id="top" className="page-shell">
        <Hero summary={summary} isLoading={isLoading} />
        <FinderPanel
          keyword={keyword}
          status={status}
          sortOrder={sortOrder}
          summary={summary}
          isLoading={isLoading}
          error={error}
          onKeywordChange={setKeyword}
          onStatusChange={setStatus}
          onSortOrderChange={setSortOrder}
          onRefresh={reload}
        />
        <ScheduleList
          items={pagedScheduleItems}
          totalFilteredCount={filteredItems.length}
          totalCount={items.length}
          primaryCount={primaryScheduleItems.length}
          closedCount={closedScheduleItems.length}
          closedItems={pagedClosedItems}
          todayLabel={todayLabel}
          isLoading={isLoading}
          selectedStatus={status}
          sortOrder={sortOrder}
          currentPage={schedulePage}
          totalPages={scheduleTotalPages}
          closedCurrentPage={closedPage}
          closedTotalPages={closedTotalPages}
          onPageChange={setSchedulePage}
          onClosedPageChange={setClosedPage}
          onItemSelect={setSelectedItem}
          pageSize={SCHEDULE_PAGE_SIZE}
        />
        <LatestOfferList
          items={pagedLatestItems}
          totalCount={latestItems.length}
          todayLabel={todayLabel}
          isLoading={isLoading}
          currentPage={latestPage}
          totalPages={latestTotalPages}
          onPageChange={setLatestPage}
          onItemSelect={setSelectedItem}
        />
        <NoticeCard warning={summary.warning} />
      </main>
      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
