import { useEffect, useState } from 'react';

const BASE_URL = import.meta.env.BASE_URL;
const IPO_DATA_URL = `${BASE_URL}data/ipos.json`;
const IPO_REPORT_URL = `${BASE_URL}data/ipo-ai-report.json`;

async function readJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function normalizeText(value, fallback = '-') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short' }).format(date).replace(/\.$/, '');
}

function formatFullDate(value) {
  const date = parseDate(value);
  if (!date) return normalizeText(value, '-');
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replace(/\.$/, '');
}

function toNumber(value) {
  const digits = String(value ?? '').replace(/[^0-9.-]/g, '');
  if (!digits) return null;
  const number = Number(digits);
  return Number.isFinite(number) ? number : null;
}

function formatWon(value) {
  const number = toNumber(value);
  if (number === null || number <= 0) return normalizeText(value, '미정');
  return `${number.toLocaleString('ko-KR')}원`;
}

function formatAmount(value) {
  const number = toNumber(value);
  if (number === null || number <= 0) return normalizeText(value, '미공시');
  if (number >= 1_0000_0000_0000) return `${(number / 1_0000_0000_0000).toFixed(2)}조원`;
  if (number >= 1_0000_0000) return `${(number / 1_0000_0000).toFixed(1)}억원`;
  return `${number.toLocaleString('ko-KR')}원`;
}

function formatList(values, fallback = '확인 필요') {
  if (!Array.isArray(values) || !values.length) return fallback;
  const text = values.map((value) => normalizeText(value, '')).filter(Boolean).join(', ');
  return text || fallback;
}

function getHashRoute() {
  if (typeof window === 'undefined') return { page: 'home', detail: '' };
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  const [page = 'home', ...rest] = raw ? raw.split('/') : ['home'];
  return { page: page || 'home', detail: rest.join('/') };
}

function useHashRoute() {
  const [route, setRoute] = useState(getHashRoute);
  useEffect(() => {
    const update = () => setRoute(getHashRoute());
    window.addEventListener('hashchange', update);
    update();
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

function getIpoRouteId(item, index) {
  const raw = item?.receiptNo || item?.corpCode || item?.stockCode || item?.companyName || `ipo-${index}`;
  return encodeURIComponent(String(raw).replace(/\s+/g, '-'));
}

function startOfDay(value) {
  const date = value instanceof Date ? new Date(value) : parseDate(value);
  if (!date) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, days) {
  const date = startOfDay(value) || startOfDay(new Date());
  date.setDate(date.getDate() + days);
  return date;
}

function getReferenceDate(updatedAt) {
  return startOfDay(updatedAt) || startOfDay(new Date());
}

function getIpoStatus(item, referenceDate = new Date()) {
  const now = startOfDay(referenceDate) || startOfDay(new Date());
  const start = parseDate(item.scheduleStart);
  const end = parseDate(item.scheduleEnd);
  const refund = parseDate(item.refundDate);
  const listing = parseDate(item.listingDate);
  if (start && end && now >= start && now <= end) return '청약 진행';
  if (start && start >= now) return '청약 예정';
  if (refund && refund >= now) return '환불 예정';
  if (listing && listing >= now) return '상장 예정';
  return '일정 확인';
}

function buildEvents(items) {
  return items.flatMap((item, index) => [
    item.scheduleStart ? { type: '청약', date: item.scheduleStart, item, index } : null,
    item.refundDate ? { type: '환불', date: item.refundDate, item, index } : null,
    item.listingDate ? { type: '상장', date: item.listingDate, item, index } : null,
  ].filter(Boolean)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function eventDate(event) {
  return startOfDay(event?.date);
}

function itemSortDate(item) {
  return parseDate(item.scheduleStart) || parseDate(item.refundDate) || parseDate(item.listingDate) || parseDate(item.receiptDate);
}

function sortScheduleItems(items, referenceDate) {
  const refTime = startOfDay(referenceDate).getTime();
  return [...items].sort((a, b) => {
    const aDate = itemSortDate(a);
    const bDate = itemSortDate(b);
    const aTime = aDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = bDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const aUpcoming = aTime >= refTime;
    const bUpcoming = bTime >= refTime;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? aTime - bTime : bTime - aTime;
  });
}

function eventMatchesFilters(event, month, status) {
  const eventMonth = String(event?.date ?? '').slice(0, 7);
  return (month === 'all' || eventMonth === month) && (status === 'all' || event.type === status);
}

function isOnOrAfter(event, referenceDate) {
  const date = eventDate(event);
  return Boolean(date && date >= referenceDate);
}

function buildItemRows(items, events, month, status, referenceDate) {
  return items.map((item, index) => {
    const itemEvents = events.filter((event) => event.index === index);
    const matchingEvents = itemEvents.filter((event) => eventMatchesFilters(event, month, status));
    const upcoming = matchingEvents.filter((event) => isOnOrAfter(event, referenceDate));
    const primaryEvent = (upcoming.length ? upcoming : matchingEvents)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] ?? itemEvents[0] ?? null;
    return { item, index, events: itemEvents, matchingEvents, primaryEvent };
  }).filter((row) => row.matchingEvents.length);
}

function getWeekRange(referenceDate) {
  const now = startOfDay(referenceDate) || startOfDay(new Date());
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isThisWeek(value, referenceDate) {
  const date = startOfDay(value);
  if (!date) return false;
  const { start, end } = getWeekRange(referenceDate);
  return date >= start && date <= end;
}

function countThisWeek(events, type, referenceDate) {
  return events.filter((event) => event.type === type && isThisWeek(event.date, referenceDate)).length;
}

function upcomingEvents(events, referenceDate, month = 'all', status = 'all', days = 45) {
  const start = startOfDay(referenceDate);
  const limit = month === 'all' ? addDays(start, days) : null;
  return events
    .filter((event) => eventMatchesFilters(event, month, status))
    .filter((event) => isOnOrAfter(event, start))
    .filter((event) => !limit || eventDate(event) <= limit)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function filterEvents(events, referenceDate, month = 'all', status = 'all', days = 45) {
  return upcomingEvents(events, referenceDate, month, status, days);
}

function dateBars(events, referenceDate, month, status) {
  const end = month === 'all' ? addDays(referenceDate, 45) : addDays(referenceDate, 370);
  const source = events
    .filter((event) => eventMatchesFilters(event, month, status))
    .filter((event) => isOnOrAfter(event, referenceDate))
    .filter((event) => eventDate(event) <= end);
  const map = new Map();
  source.forEach((event) => {
    const key = String(event.date).slice(0, 10);
    if (!key) return;
    const bucket = map.get(key) ?? { label: key, value: 0, total: 0, 청약: 0, 환불: 0, 상장: 0 };
    bucket[event.type] += 1;
    bucket.value += 1;
    bucket.total += 1;
    map.set(key, bucket);
  });
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(0, 12);
}

function typeBars(events, referenceDate, month, status) {
  const end = month === 'all' ? addDays(referenceDate, 120) : addDays(referenceDate, 370);
  const source = events
    .filter((event) => eventMatchesFilters(event, month, status))
    .filter((event) => isOnOrAfter(event, referenceDate))
    .filter((event) => eventDate(event) <= end);
  return ['청약', '환불', '상장'].map((type) => ({ label: type, value: source.filter((event) => event.type === type).length }));
}

function summarizeCounts(events) {
  return ['청약', '환불', '상장']
    .map((type) => ({ label: type, value: events.filter((event) => event.type === type).length }))
    .filter((bar) => bar.value > 0)
    .map((bar) => `${bar.label} ${bar.value}건`)
    .join(', ');
}

function readReportLines(reportPayload, hasItems) {
  const source = normalizeText(reportPayload?.metadata?.source, '').toLowerCase();
  if (hasItems && source === 'pending') return [];
  const lines = Array.isArray(reportPayload?.lines) ? reportPayload.lines : [];
  return lines.map((line) => normalizeText(line, '')).filter(Boolean).slice(0, 3);
}



function buildSummaryLines(events, referenceDate, month, status) {
  const nearEvents = upcomingEvents(events, referenceDate, month, status, 45);
  if (!nearEvents.length) {
    const futureExists = events.some((event) => eventMatchesFilters(event, month, status) && isOnOrAfter(event, referenceDate));
    return [
      futureExists ? '기준일 이후 가까운 일정은 45일 이내에 없습니다.' : '선택한 조건의 기준일 이후 예정 일정이 없습니다.',
      '지난 일정은 요약에서 제외하고 일정표에서만 확인할 수 있습니다.',
      '이 화면은 일정 확인용이며 투자 판단을 제공하지 않습니다.',
    ];
  }
  const countText = summarizeCounts(nearEvents);
  const rangeText = month === 'all' ? '기준일 이후 45일 이내' : `${month} 예정`;
  const lines = [`${rangeText} 일정은 ${countText || `${nearEvents.length}건`}입니다.`];
  nearEvents.slice(0, 2).forEach((event) => {
    lines.push(`${formatDate(event.date)} ${event.type}: ${normalizeText(event.item?.companyName)} · ${formatList(event.item?.underwriters)}`);
  });
  return lines.slice(0, 3);
}

function Shell({ children }) {
  return <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-900 md:px-8"><div className="mx-auto max-w-[1180px] space-y-5">{children}</div></main>;
}

function PageHeader({ updatedAt }) {
  return (
    <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="break-keep text-3xl font-black tracking-tight text-slate-950 md:text-4xl">상장노트</h1>
          <p className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-600">IPO 청약·환불·상장 일정을 정리한 일정표 사이트</p>
        </div>
        <p className="text-xs font-semibold text-slate-500 md:text-right">기준일 {formatFullDate(updatedAt)}</p>
      </div>
    </header>
  );
}

function InfoStrip({ items }) {
  return (
    <dl className="grid border border-slate-200 bg-white md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-b border-slate-200 px-5 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
          <dt className="text-xs font-bold text-slate-500">{item.label}</dt>
          <dd className="mt-2 text-2xl font-black tracking-tight text-slate-950">{item.value}</dd>
          <dd className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-500">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="break-keep text-lg font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-500">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="grid min-h-52 place-items-center border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="max-w-sm"><p className="text-sm font-black text-slate-700">{title}</p><p className="mt-3 break-keep text-sm font-semibold leading-6 text-slate-500">{description}</p></div>
    </div>
  );
}

const TYPE_STYLES = {
  청약: 'bg-violet-600',
  환불: 'bg-blue-500',
  상장: 'bg-emerald-600',
};

function ScheduleTypeLegend() {
  return (
    <div className="mb-4 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
      {['청약', '환불', '상장'].map((type) => (
        <span key={type} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 ${TYPE_STYLES[type]}`} />{type}</span>
      ))}
    </div>
  );
}

function DateBars({ bars }) {
  const chartBars = bars.filter((bar) => Number(bar.total) > 0);
  if (!chartBars.length) return <EmptyPanel title="예정 일정이 없습니다" description="기준일 이후 선택 조건에 맞는 일정이 있으면 일자별 현황이 표시됩니다." />;
  const max = Math.max(...chartBars.map((bar) => Number(bar.total)), 1);
  return (
    <div>
      <ScheduleTypeLegend />
      <div className="space-y-5">
        {chartBars.map((bar) => {
          const total = Number(bar.total || 0);
          const width = Math.max(18, (total / max) * 100);
          return (
            <div key={bar.label} className="grid gap-2 md:grid-cols-[86px_1fr_64px] md:items-center">
              <div className="font-black tabular-nums text-slate-800">{formatDate(bar.label)}</div>
              <div>
                <div className="h-8 border border-slate-200 bg-slate-50">
                  <div className="flex h-full" style={{ width: `${width}%` }}>
                    {['청약', '환불', '상장'].map((type) => {
                      const value = Number(bar[type] || 0);
                      if (!value) return null;
                      return <span key={type} className={`h-full ${TYPE_STYLES[type]}`} style={{ width: `${Math.max(18, (value / total) * 100)}%` }} title={`${type} ${value}건`} />;
                    })}
                  </div>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">청약 {bar.청약}건 · 환불 {bar.환불}건 · 상장 {bar.상장}건</p>
              </div>
              <div className="text-right font-black tabular-nums text-slate-950">{total}건</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TypeBars({ bars }) {
  const chartBars = bars.filter((bar) => Number.isFinite(Number(bar.value)));
  if (!chartBars.some((bar) => bar.value > 0)) return <EmptyPanel title="예정 일정이 없습니다" description="기준일 이후 일정이 있으면 구분별 현황이 표시됩니다." />;
  const max = Math.max(...chartBars.map((bar) => Number(bar.value)), 1);
  const total = chartBars.reduce((sum, bar) => sum + Number(bar.value || 0), 0);
  return (
    <div className="space-y-5">
      {chartBars.map((bar) => {
        const value = Number(bar.value || 0);
        const width = Math.max(14, (value / max) * 100);
        const percent = total ? Math.round((value / total) * 100) : 0;
        return (
          <div key={bar.label} className="grid gap-2 md:grid-cols-[72px_1fr_104px] md:items-center">
            <span className="font-black text-slate-800">{bar.label}</span>
            <span className="h-7 border border-slate-200 bg-slate-50"><span className={`block h-full ${TYPE_STYLES[bar.label] || 'bg-slate-800'}`} style={{ width: `${width}%` }} /></span>
            <span className="text-right font-black tabular-nums text-slate-950">{value}건 · {percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTable({ rows, referenceDate }) {
  return (
    <div className="overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="hidden bg-slate-100 text-left text-xs font-black text-slate-600 md:table-header-group">
          <tr><th className="px-4 py-3">날짜</th><th className="px-4 py-3">기업명</th><th className="px-4 py-3">구분</th><th className="px-4 py-3">주관사</th><th className="px-4 py-3 text-right">공모가</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.length ? rows.slice(0, 12).map((row) => {
            const item = row.item;
            const event = row.primaryEvent;
            return (
              <tr key={`${item.companyName}-${row.index}`} className="block p-4 md:table-row md:p-0">
                <td className="flex justify-between py-2 font-semibold text-slate-700 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">날짜</span>{formatDate(event?.date || item.scheduleStart || item.receiptDate || item.listingDate)}</td>
                <td className="block py-2 md:table-cell md:px-4 md:py-3"><a href={`#/ipo/${getIpoRouteId(item, row.index)}`} className="font-black text-slate-950 underline-offset-4 hover:underline">{normalizeText(item.companyName)}</a><p className="mt-1 text-xs font-semibold text-slate-500">{normalizeText(item.stockCode, '종목코드 미공시')}</p></td>
                <td className="flex justify-between py-2 font-semibold text-slate-700 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">구분</span>{event?.type || getIpoStatus(item, referenceDate)}</td>
                <td className="flex justify-between py-2 font-semibold text-slate-700 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">주관사</span>{formatList(item.underwriters)}</td>
                <td className="flex justify-between py-2 text-right font-black tabular-nums text-slate-950 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">공모가</span>{formatWon(item.offerPrice)}</td>
              </tr>
            );
          }) : <tr><td colSpan="5" className="px-4 py-10 text-center text-sm font-semibold text-slate-500">기준일 이후 선택 조건에 맞는 IPO 일정이 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SummaryList({ lines }) {
  return <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">{lines.map((line, index) => <li key={`${line}-${index}`} className="break-keep px-4 py-3 text-sm font-semibold leading-6 text-slate-700">{line}</li>)}</ul>;
}

function DetailGrid({ rows }) {
  return <dl className="grid border border-slate-200 bg-white md:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="border-b border-slate-200 px-4 py-3 md:border-r md:[&:nth-child(2n)]:border-r-0"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-keep text-sm font-semibold leading-6 text-slate-900">{value ?? '-'}</dd></div>)}</dl>;
}

function IpoDetail({ item, index, updatedAt, referenceDate }) {
  if (!item) return <Shell><PageHeader updatedAt={updatedAt} /><Panel title="일정을 찾을 수 없습니다" description="홈에서 다시 선택해 주세요."><a href="#/" className="inline-flex border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">홈으로</a></Panel></Shell>;
  return (
    <Shell>
      <PageHeader updatedAt={updatedAt} />
      <section className="border border-slate-200 bg-white px-5 py-5 md:px-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div><p className="text-sm font-semibold text-slate-500">IPO 일정 상세</p><h2 className="mt-1 break-keep text-3xl font-black tracking-tight text-slate-950">{normalizeText(item.companyName)}</h2><p className="mt-2 text-sm font-semibold text-slate-600">{normalizeText(item.reportName)} · {getIpoStatus(item, referenceDate)}</p></div>
          <a href="#/" className="inline-flex w-fit border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">목록으로</a>
        </div>
      </section>
      <InfoStrip items={[
        { label: '청약 기간', value: `${formatFullDate(item.scheduleStart)} ~ ${formatFullDate(item.scheduleEnd)}`, detail: '공시 기준 일정' },
        { label: '환불일', value: formatFullDate(item.refundDate), detail: '공시 기준 일정' },
        { label: '상장 예정일', value: formatFullDate(item.listingDate), detail: '공시 기준 일정' },
      ]} />
      <Panel title="상세 정보" description="일정 확인용 정보이며 투자 판단을 제공하지 않습니다.">
        <DetailGrid rows={[
          ['기업명', normalizeText(item.companyName)], ['증권 유형', normalizeText(item.securityType)], ['공모 방식', normalizeText(item.offeringMethod)], ['주관사', formatList(item.underwriters)],
          ['공모가', formatWon(item.offerPrice)], ['공모총액', formatAmount(item.offerAmount)], ['일반청약 경쟁률', normalizeText(item.subscriptionCompetitionRate, '미공시')], ['기관 수요예측 경쟁률', normalizeText(item.demandForecastCompetitionRate, '미공시')],
          ['접수일', formatFullDate(item.receiptDate)], ['납입일', formatFullDate(item.paymentDate)], ['배정공고일', formatFullDate(item.allotmentNoticeDate)], ['종목코드', normalizeText(item.stockCode, '미공시')],
        ]} />
        <div className="mt-4 flex flex-wrap gap-2">
          {item.dartUrl ? <a href={item.dartUrl} target="_blank" rel="noreferrer" className="inline-flex border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">공시 원문</a> : null}
          {item.mainMatterUrl ? <a href={item.mainMatterUrl} target="_blank" rel="noreferrer" className="inline-flex border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">주요사항보고서</a> : null}
        </div>
      </Panel>
      <footer className="border border-slate-200 bg-white px-5 py-4 text-center text-xs font-semibold text-slate-500">개인적 학습 목적으로 제작된 정적 데이터 사이트 · 투자 권유 목적이 아닙니다.</footer>
    </Shell>
  );
}

export default function App() {
  const route = useHashRoute();
  const [payload, setPayload] = useState(null);
  const [reportPayload, setReportPayload] = useState(null);
  const [month, setMonth] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    Promise.all([
      readJson(IPO_DATA_URL, { metadata: {}, items: [] }),
      readJson(IPO_REPORT_URL, { metadata: { source: 'pending' }, lines: [] }),
    ]).then(([ipoData, reportData]) => {
      setPayload(ipoData);
      setReportPayload(reportData);
    });
  }, []);

  const allItems = Array.isArray(payload?.items) ? payload.items : [];
  const referenceDate = getReferenceDate(payload?.metadata?.updatedAt);
  const events = buildEvents(allItems);
  const monthOptions = [...new Set(events.map((event) => String(event.date).slice(0, 7)).filter(Boolean))].sort().reverse();
  const rows = buildItemRows(allItems, events, month, status, referenceDate).sort((a, b) => {
    const aTime = eventDate(a.primaryEvent)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = eventDate(b.primaryEvent)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
  const detailItem = route.page === 'ipo' && route.detail ? allItems.find((item, index) => getIpoRouteId(item, index) === route.detail) : null;
  if (route.page === 'ipo' && route.detail) return <IpoDetail item={detailItem} index={allItems.indexOf(detailItem)} updatedAt={payload?.metadata?.updatedAt} referenceDate={referenceDate} />;

  const reportLines = readReportLines(reportPayload, allItems.length > 0);
  const lines = month === 'all' && status === 'all' && reportLines.length
    ? reportLines
    : buildSummaryLines(events, referenceDate, month, status);
  return (
    <Shell>
      <PageHeader updatedAt={payload?.metadata?.updatedAt} />
      <section className="border border-slate-200 bg-white px-4 py-3 md:px-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label><span className="mb-1 block text-xs font-bold text-slate-600">월</span><select className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950" value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">전체</option>{monthOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-bold text-slate-600">구분</span><select className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">전체</option><option value="청약">청약</option><option value="환불">환불</option><option value="상장">상장</option></select></label>
          <p className="text-xs font-semibold leading-5 text-slate-500">OpenDART 공시 기반</p>
        </div>
      </section>
      <InfoStrip items={[
        { label: '향후 7일 청약', value: `${filterEvents(events, referenceDate, month, '청약', 7).length}건`, detail: '기준일 이후 7일' },
        { label: '향후 7일 환불', value: `${filterEvents(events, referenceDate, month, '환불', 7).length}건`, detail: '기준일 이후 7일' },
        { label: '향후 7일 상장', value: `${filterEvents(events, referenceDate, month, '상장', 7).length}건`, detail: '기준일 이후 7일' },
      ]} />
      <Panel title="IPO 일정표" description="기업명을 누르면 공모 일정과 공시 정보를 확인할 수 있습니다.">
        <ScheduleTable rows={rows} referenceDate={referenceDate} />
      </Panel>
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="일자별 예정 일정" description="현재 선택한 월과 구분 기준으로 기준일 이후 일정만 집계합니다."><DateBars bars={dateBars(events, referenceDate, month, status)} /></Panel>
        <Panel title="구분별 예정 일정 수" description="현재 필터 기준의 예정 일정을 비교합니다."><TypeBars bars={typeBars(events, referenceDate, month, status)} /></Panel>
      </section>
      <Panel title="요약" description="지난 일정과 먼 미래 일정은 홈 요약에서 제외합니다."><SummaryList lines={lines} /></Panel>
      <footer className="border border-slate-200 bg-white px-5 py-4 text-center text-xs font-semibold text-slate-500">개인적 학습 목적으로 제작된 정적 데이터 사이트 · 투자 권유 목적이 아닙니다.</footer>
    </Shell>
  );
}
