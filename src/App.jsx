import { useEffect, useMemo, useState } from 'react';

const BASE_URL = import.meta.env.BASE_URL;
const IPO_DATA_URL = `${BASE_URL}data/ipos.json`;
const IPO_REPORT_URL = `${BASE_URL}data/ipo-ai-report.json`;

const STATUS_LABELS = {
  open: '청약',
  upcoming: '예정',
  closed: '마감',
  refund: '환불',
  listing: '상장',
  unknown: '확인',
};

const STATUS_STYLES = {
  open: 'bg-violet-100 text-violet-700',
  upcoming: 'bg-blue-100 text-blue-700',
  closed: 'bg-slate-100 text-slate-600',
  refund: 'bg-blue-100 text-blue-700',
  listing: 'bg-emerald-100 text-emerald-700',
  unknown: 'bg-slate-100 text-slate-600',
};

async function readJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short' }).format(date).replace(/\.$/, '');
}

function formatFullDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replace(/\.$/, '');
}

function normalizeText(value, fallback = '-') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

const INVESTMENT_WORD_PATTERN = /(추천|권유|수익률|수익|전망|매수|매도|유망|투자\s*포인트)/;
function safeSummaryLines(lines, fallbackLines) {
  const cleaned = lines
    .map((line) => normalizeText(line, ''))
    .filter(Boolean)
    .filter((line) => !INVESTMENT_WORD_PATTERN.test(line))
    .slice(0, 3);
  return cleaned.length ? cleaned : fallbackLines;
}

function normalizeStatus(item) {
  const rawStatus = String(item?.status ?? '').toLowerCase();
  if (rawStatus.includes('open') || rawStatus.includes('진행')) return 'open';
  if (rawStatus.includes('closed') || rawStatus.includes('마감')) return 'closed';
  if (rawStatus.includes('upcoming') || rawStatus.includes('예정')) return 'upcoming';

  const today = new Date();
  const start = parseDate(item?.scheduleStart || item?.subscriptionDate);
  const end = parseDate(item?.scheduleEnd || item?.scheduleStart);
  if (start && end) {
    if (today >= start && today <= end) return 'open';
    if (today < start) return 'upcoming';
    return 'closed';
  }
  return 'unknown';
}

function getPrimaryDate(item) {
  return item.scheduleStart || item.subscriptionDate || item.receiptDate || item.refundDate || item.listingDate || '';
}

function getMonthKey(value) {
  const date = parseDate(value);
  if (!date) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey) {
  if (monthKey === 'unknown') return '날짜 미정';
  const [year, month] = monthKey.split('-');
  return `${year}년 ${Number(month)}월`;
}

function getUnderwriter(item) {
  if (Array.isArray(item.underwriters) && item.underwriters.length) return item.underwriters.join(', ');
  return normalizeText(item.underwriter || item.leadManager || item.manager, '-');
}

function getScheduleRows(items) {
  const rows = [];
  items.forEach((item) => {
    const status = normalizeStatus(item);
    if (item.scheduleStart || item.subscriptionDate) {
      rows.push({ type: '청약', status: status === 'closed' ? 'closed' : 'open', date: item.scheduleStart || item.subscriptionDate, item });
    }
    if (item.refundDate) rows.push({ type: '환불', status: 'refund', date: item.refundDate, item });
    if (item.listingDate) rows.push({ type: '상장', status: 'listing', date: item.listingDate, item });
    if (!item.scheduleStart && !item.subscriptionDate && !item.refundDate && !item.listingDate) {
      rows.push({ type: '확인', status: 'unknown', date: item.receiptDate || '', item });
    }
  });
  return rows.sort((left, right) => String(left.date || '9999').localeCompare(String(right.date || '9999')));
}

function getWeekRows(rows) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return rows.filter((row) => {
    const date = parseDate(row.date);
    return date && date >= monday && date <= sunday;
  });
}

function buildMonthStats(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const monthKey = getMonthKey(row.date);
    if (!map.has(monthKey)) map.set(monthKey, { label: getMonthLabel(monthKey).replace(/^\d{4}년 /, ''), open: 0, refund: 0, listing: 0 });
    const bucket = map.get(monthKey);
    if (row.type === '청약') bucket.open += 1;
    if (row.type === '환불') bucket.refund += 1;
    if (row.type === '상장') bucket.listing += 1;
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).slice(-6);
}

function Icon({ type }) {
  const icons = {
    calendar: 'M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v16H2V6a2 2 0 0 1 2-2h3V2Zm15 8H4v10h18V10Z',
    wallet: 'M3 6h16a2 2 0 0 1 2 2v3h-5a4 4 0 0 0 0 8h5v1a2 2 0 0 1-2 2H3V6Zm14 7a2 2 0 0 0 0 4h4v-4h-4Z',
    flag: 'M5 3h12l-1.5 4L17 11H7v10H5V3Z',
  };
  return <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={icons[type] ?? icons.calendar} /></svg>;
}

function FilterField({ label, value, onChange, options, icon }) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-3 border-slate-200 px-3 py-3 md:border-r last:border-r-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
        <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </span>
    </label>
  );
}

function InfoField({ label, value, icon }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
        <span className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">{value}</span>
      </span>
    </div>
  );
}

function MetricCard({ icon, title, value, subtitle }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex min-h-24 items-center justify-center gap-8">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700"><Icon type={icon} /></div>
        <div className="min-w-0">
          <p className="break-keep text-sm font-black text-slate-700">{title}</p>
          <p className="mt-1 flex items-end gap-2 text-5xl font-black tabular-nums text-violet-700">{value}<span className="mb-2 text-base font-bold text-slate-700">건</span></p>
          {subtitle ? <p className="mt-2 text-xs font-bold text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status, label }) {
  return <span className={`inline-flex min-w-14 justify-center rounded-lg px-3 py-1 text-xs font-extrabold ${STATUS_STYLES[status] ?? STATUS_STYLES.unknown}`}>{label ?? STATUS_LABELS[status] ?? '확인'}</span>;
}

function ScheduleTable({ rows, title = '이번 주 IPO 일정' }) {
  const tableClass = 'w-full border-separate border-spacing-y-3 text-sm md:border-collapse md:border-spacing-y-0';
  const rowClass = 'block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none';
  const cellClass = 'flex items-start justify-between gap-4 border-b border-slate-100 px-1 py-2 text-right font-semibold text-slate-600 last:border-b-0 md:table-cell md:px-3 md:py-3 md:text-left';
  const mobileLabelClass = 'shrink-0 font-extrabold text-slate-500 md:hidden';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-slate-900">{title}</h2>
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead className="hidden md:table-header-group">
            <tr className="border-y border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-3 py-3 text-left font-extrabold">날짜</th>
              <th className="px-3 py-3 text-left font-extrabold">구분</th>
              <th className="px-3 py-3 text-left font-extrabold">기업명</th>
              <th className="px-3 py-3 text-left font-extrabold">주관사</th>
              <th className="px-3 py-3 text-left font-extrabold">상태</th>
            </tr>
          </thead>
          <tbody className="md:divide-y md:divide-slate-100">
            {rows.length ? rows.map((row, index) => (
              <tr key={`${row.type}-${row.item.receiptNo ?? row.item.companyName}-${index}`} className={rowClass}>
                <td className={cellClass}><span className={mobileLabelClass}>날짜</span><span>{formatDate(row.date)}</span></td>
                <td className={cellClass}><span className={mobileLabelClass}>구분</span><StatusBadge status={row.status} label={row.type} /></td>
                <td className={cellClass}><span className={mobileLabelClass}>기업명</span><span className="font-bold text-slate-900">{normalizeText(row.item.companyName)}</span></td>
                <td className={cellClass}><span className={mobileLabelClass}>주관사</span><span>{getUnderwriter(row.item)}</span></td>
                <td className={cellClass}><span className={mobileLabelClass}>상태</span><StatusBadge status={row.status} /></td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="block rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center font-semibold text-slate-500 md:table-cell md:border-0 md:bg-transparent">
                  데이터 갱신 후 표시됩니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3 text-center text-sm font-bold text-slate-500">전체 일정 보기 <span aria-hidden="true">→</span></div>
    </article>
  );
}

function Timeline({ rows, title = '일정 흐름' }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-slate-900">{title}</h2>
      {rows.length ? (
        <div className="relative space-y-4">
          <span className="absolute left-[6px] top-3 h-[calc(100%-24px)] w-px bg-slate-200 md:left-[9px]" aria-hidden="true" />
          {rows.map((row, index) => (
            <div key={`${row.type}-${row.item.companyName}-${row.date}-${index}`} className="relative grid grid-cols-[22px_1fr] gap-3 text-sm md:grid-cols-[28px_132px_80px_1fr]">
              <span className={`relative z-10 mt-2 h-3.5 w-3.5 rounded-full ring-4 ring-white ${row.status === 'listing' ? 'bg-emerald-600' : row.status === 'refund' ? 'bg-blue-500' : 'bg-violet-600'}`} />
              <span className="font-semibold text-slate-600 md:col-auto">{formatDate(row.date)}</span>
              <span className="col-start-2 md:col-start-auto"><StatusBadge status={row.status} label={row.type} /></span>
              <span className="col-start-2 font-bold text-slate-900 md:col-start-auto">{normalizeText(row.item.companyName)}<span className="block font-semibold text-slate-500 md:ml-2 md:inline">{getUnderwriter(row.item)}</span></span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-3 text-center text-sm font-bold text-slate-500">전체 일정 보기 <span aria-hidden="true">→</span></div>
        </div>
      ) : <div className="grid h-56 place-items-center text-sm font-semibold text-slate-500">데이터 갱신 후 표시됩니다.</div>}
    </article>
  );
}

function MonthBarChart({ rows }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const max = Math.max(...rows.map((row) => row.open + row.refund + row.listing), 1);
  const active = activeIndex !== null ? rows[activeIndex] : rows[0];
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">월별 일정 현황</h2>
          <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-600" />청약</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />환불</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />상장</span>
          </div>
        </div>
        {active ? <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs font-bold leading-5 text-white"><div>{active.label} 총 {active.open + active.refund + active.listing}건</div><div>청약 {active.open} · 환불 {active.refund} · 상장 {active.listing}</div></div> : null}
      </div>
      <div className="flex h-56 items-end gap-5 border-b border-slate-200 px-3 pb-3">
        {rows.length ? rows.map((row, index) => (
          <button type="button" key={row.label} className="flex flex-1 flex-col items-center gap-2" onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onClick={() => setActiveIndex(index)}>
            <div className="flex h-44 items-end gap-1">
              {['open', 'refund', 'listing'].map((key) => {
                const value = row[key];
                const color = key === 'open' ? 'bg-violet-600' : key === 'refund' ? 'bg-blue-500' : 'bg-emerald-500';
                return <span key={key} className={`w-5 rounded-t-md ${color} transition-opacity`} style={{ height: Math.max(6, (value / max) * 160), opacity: activeIndex === null || activeIndex === index ? 1 : 0.55 }} title={`${row.label} ${key} ${value}`} />;
              })}
            </div>
            <span className="text-xs font-bold text-slate-600">{row.label}</span>
          </button>
        )) : <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-500">데이터 갱신 후 표시됩니다.</div>}
      </div>
    </article>
  );
}

function DonutChart({ counts }) {
  const [activeKey, setActiveKey] = useState(null);
  const total = counts.open + counts.refund + counts.listing;
  const segments = [
    { key: 'open', label: '청약', value: counts.open, color: '#7c3aed' },
    { key: 'refund', label: '환불', value: counts.refund, color: '#3b82f6' },
    { key: 'listing', label: '상장', value: counts.listing, color: '#22a55e' },
  ];
  const active = segments.find((segment) => segment.key === activeKey) || segments[0];
  let offset = 0;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-lg font-extrabold text-slate-900">구분별 비중</h2>
        {active && total ? <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs font-bold leading-5 text-white">{active.label} {active.value}건<br />{((active.value / total) * 100).toFixed(1)}%</div> : null}
      </div>
      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center">
        <svg className="h-48 w-48" viewBox="0 0 120 120" role="img" aria-label="구분별 비중 그래프">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="18" />
          {segments.map((segment) => {
            const dash = total ? (segment.value / total) * circumference : 0;
            const element = (
              <circle
                key={segment.key}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={activeKey === segment.key ? 21 : 18}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setActiveKey(segment.key)}
                onClick={() => setActiveKey(segment.key)}
              />
            );
            offset += dash;
            return element;
          })}
          <text x="60" y="58" textAnchor="middle" className="fill-slate-900 text-sm font-black">총 {total}건</text>
        </svg>
        <div className="space-y-3">
          {segments.map((segment) => (
            <button key={segment.key} type="button" className="grid w-full grid-cols-[18px_80px_1fr] items-center gap-3 text-left text-sm font-bold text-slate-700" onMouseEnter={() => setActiveKey(segment.key)} onClick={() => setActiveKey(segment.key)}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
              <span>{segment.label}</span>
              <span>{segment.value}건 {total ? `(${((segment.value / total) * 100).toFixed(1)}%)` : ''}</span>
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function App() {
  const [ipoPayload, setIpoPayload] = useState(null);
  const [ipoReportPayload, setIpoReportPayload] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    Promise.all([
      readJson(IPO_DATA_URL, { metadata: {}, items: [] }),
      readJson(IPO_REPORT_URL, { metadata: {}, lines: [] }),
    ]).then(([ipoData, ipoReport]) => {
      setIpoPayload(ipoData);
      setIpoReportPayload(ipoReport);
    });
  }, []);

  const allItems = Array.isArray(ipoPayload?.items) ? ipoPayload.items : [];
  const monthOptions = useMemo(() => {
    const months = [...new Set(allItems.map((item) => getMonthKey(getPrimaryDate(item))).filter((month) => month !== 'unknown'))].sort();
    return [{ value: 'all', label: '전체 월' }, ...months.map((month) => ({ value: month, label: getMonthLabel(month) }))];
  }, [allItems]);
  const filteredItems = useMemo(() => allItems.filter((item) => {
    const monthMatch = selectedMonth === 'all' || getMonthKey(getPrimaryDate(item)) === selectedMonth;
    const status = normalizeStatus(item);
    const statusMatch = selectedStatus === 'all' || status === selectedStatus;
    return monthMatch && statusMatch;
  }), [allItems, selectedMonth, selectedStatus]);
  const allRows = getScheduleRows(filteredItems);
  const weekRows = getWeekRows(allRows);
  const displayRows = weekRows.length ? weekRows : allRows.slice(0, 5);
  const displayScheduleTitle = weekRows.length ? '이번 주 IPO 일정' : '최근 IPO 일정';
  const displayTimelineTitle = weekRows.length ? '일정 흐름' : '최근 일정 흐름';
  const counts = {
    open: allRows.filter((row) => row.type === '청약').length,
    refund: allRows.filter((row) => row.type === '환불').length,
    listing: allRows.filter((row) => row.type === '상장').length,
  };
  const weekCounts = {
    open: weekRows.filter((row) => row.type === '청약').length,
    refund: weekRows.filter((row) => row.type === '환불').length,
    listing: weekRows.filter((row) => row.type === '상장').length,
  };
  const monthStats = buildMonthStats(getScheduleRows(allItems));
  const updatedAt = ipoPayload?.metadata?.updatedAt || '';
  const generatedSummaryLines = Array.isArray(ipoReportPayload?.lines)
    ? ipoReportPayload.lines.map((line) => normalizeText(line, '')).filter(Boolean).slice(0, 3)
    : [];
  const fallbackSummaryLines = allRows.length
    ? weekRows.length
      ? [
          `이번 주 청약은 ${weekCounts.open}건입니다.`,
          `이번 주 환불은 ${weekCounts.refund}건, 상장은 ${weekCounts.listing}건입니다.`,
          `기준일은 ${formatFullDate(updatedAt)}입니다.`,
        ]
      : [
          '이번 주 확정된 일정은 없습니다.',
          `최근 일정은 총 ${allRows.length}건입니다.`,
          `기준일은 ${formatFullDate(updatedAt)}입니다.`,
        ]
    : ['데이터 갱신 후 IPO 요약이 표시됩니다.'];
  const summaryLines = safeSummaryLines(generatedSummaryLines, fallbackSummaryLines);
  const weekStart = weekRows[0]?.date ? formatDate(weekRows[0].date) : null;
  const weekEnd = weekRows.at(-1)?.date ? formatDate(weekRows.at(-1).date) : null;
  const metricRange = weekStart && weekEnd ? `${weekStart} ~ ${weekEnd}` : '일정 갱신 후 표시';
  const firstRefund = weekRows.find((row) => row.type === '환불')?.date;
  const firstListing = weekRows.find((row) => row.type === '상장')?.date;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-6 md:px-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="break-keep text-4xl font-black tracking-tight text-violet-700">상장노트</h1>
            <p className="mt-1 text-base font-semibold text-slate-500">IPO 일정과 공모 정보</p>
          </div>
          <nav className="flex max-w-full gap-5 overflow-x-auto whitespace-nowrap text-sm font-black text-slate-700 md:gap-9">
            <a className="border-b-4 border-violet-700 pb-3 text-violet-700" href="#top">홈</a>
            <a className="pb-3 hover:text-violet-700" href="#week">이번 주 일정</a>
            <a className="pb-3 hover:text-violet-700" href="#subscription">청약 일정</a>
            <a className="pb-3 hover:text-violet-700" href="#listing">상장 일정</a>
            <a className="pb-3 hover:text-violet-700" href="#archive">아카이브</a>
          </nav>
        </div>
      </header>

      <div id="top" className="mx-auto max-w-[1440px] space-y-5 px-5 py-5 md:px-8">
        <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-3">
          <FilterField label="월" value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} icon={<Icon type="calendar" />} />
          <FilterField label="구분" value={selectedStatus} onChange={setSelectedStatus} options={[{ value: 'all', label: '전체' }, { value: 'open', label: '청약' }, { value: 'upcoming', label: '예정' }, { value: 'closed', label: '마감' }]} icon={<Icon type="wallet" />} />
          <InfoField label="기준일" value={formatFullDate(updatedAt)} icon={<Icon type="calendar" />} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard icon="calendar" title="이번 주 청약" value={weekCounts.open} subtitle={metricRange} />
          <MetricCard icon="wallet" title="이번 주 환불" value={weekCounts.refund} subtitle={firstRefund ? formatDate(firstRefund) : metricRange} />
          <MetricCard icon="flag" title="이번 주 상장" value={weekCounts.listing} subtitle={firstListing ? formatDate(firstListing) : metricRange} />
        </section>

        <section id="week" className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <ScheduleTable rows={displayRows} title={displayScheduleTitle} />
          <Timeline rows={displayRows} title={displayTimelineTitle} />
        </section>

        <section id="subscription" className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <MonthBarChart rows={monthStats} />
          <DonutChart counts={counts} />
        </section>

        <section id="listing" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4 md:w-64">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-violet-100 text-violet-700"><Icon type="calendar" /></div>
              <h2 className="break-keep text-xl font-black text-violet-700">이번 주 IPO 요약</h2>
            </div>
            <ul className="space-y-2 text-sm font-semibold leading-7 text-slate-700">
              {summaryLines.map((line, index) => <li key={`${line}-${index}`} className="before:mr-2 before:text-violet-700 before:content-['•']">{line}</li>)}
            </ul>
          </div>
        </section>
      </div>

      <footer className="px-6 pb-8 pt-2 text-center text-sm font-semibold text-slate-500">
        개인적 학습 목적으로 제작된 정적 데이터 사이트 · 투자 권유 목적이 아닙니다.
      </footer>
    </main>
  );
}

export default App;
