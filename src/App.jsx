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

function getIpoStatus(item) {
  const now = new Date();
  const start = parseDate(item.scheduleStart);
  const end = parseDate(item.scheduleEnd);
  const listing = parseDate(item.listingDate);
  if (start && end && now >= start && now <= end) return '청약';
  if (listing && listing >= now) return '상장 예정';
  if (start && start > now) return '청약 예정';
  return '일정 확인';
}

function buildEvents(items) {
  return items.flatMap((item, index) => [
    item.scheduleStart ? { type: '청약', date: item.scheduleStart, item, index } : null,
    item.refundDate ? { type: '환불', date: item.refundDate, item, index } : null,
    item.listingDate ? { type: '상장', date: item.listingDate, item, index } : null,
  ].filter(Boolean)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isThisWeek(value) {
  const date = parseDate(value);
  if (!date) return false;
  const { start, end } = getWeekRange();
  return date >= start && date <= end;
}

function countThisWeek(events, type) {
  return events.filter((event) => event.type === type && isThisWeek(event.date)).length;
}

function monthlyBars(events) {
  const map = new Map();
  events.forEach((event) => {
    const key = String(event.date).slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([label, value]) => ({ label, value }));
}

function typeBars(events) {
  return ['청약', '환불', '상장'].map((type) => ({ label: type, value: events.filter((event) => event.type === type).length }));
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

function HorizontalBars({ bars }) {
  const chartBars = bars.filter((bar) => Number.isFinite(Number(bar.value))).slice(0, 10);
  if (!chartBars.length) return <EmptyPanel title="일정 데이터가 없습니다" description="데이터 갱신 후 표시됩니다." />;
  const max = Math.max(...chartBars.map((bar) => Number(bar.value)), 1);
  return (
    <div className="space-y-3">
      {chartBars.map((bar) => {
        const width = Math.max(8, (Number(bar.value) / max) * 100);
        return (
          <div key={bar.label} className="grid grid-cols-[72px_1fr_44px] items-center gap-3 text-sm">
            <span className="truncate font-bold text-slate-700">{bar.label}</span>
            <span className="h-2 bg-slate-100"><span className="block h-2 bg-slate-800" style={{ width: `${width}%` }} /></span>
            <span className="text-right font-black tabular-nums text-slate-950">{bar.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTable({ items }) {
  return (
    <div className="overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="hidden bg-slate-100 text-left text-xs font-black text-slate-600 md:table-header-group">
          <tr><th className="px-4 py-3">날짜</th><th className="px-4 py-3">기업명</th><th className="px-4 py-3">구분</th><th className="px-4 py-3">주관사</th><th className="px-4 py-3 text-right">공모가</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.length ? items.slice(0, 12).map((item, index) => (
            <tr key={`${item.companyName}-${index}`} className="block p-4 md:table-row md:p-0">
              <td className="flex justify-between py-2 font-semibold text-slate-700 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">날짜</span>{formatDate(item.scheduleStart || item.receiptDate || item.listingDate)}</td>
              <td className="block py-2 md:table-cell md:px-4 md:py-3"><a href={`#/ipo/${getIpoRouteId(item, index)}`} className="font-black text-slate-950 underline-offset-4 hover:underline">{normalizeText(item.companyName)}</a><p className="mt-1 text-xs font-semibold text-slate-500">{normalizeText(item.stockCode, '종목코드 미공시')}</p></td>
              <td className="flex justify-between py-2 font-semibold text-slate-700 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">구분</span>{getIpoStatus(item)}</td>
              <td className="flex justify-between py-2 font-semibold text-slate-700 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">주관사</span>{formatList(item.underwriters)}</td>
              <td className="flex justify-between py-2 text-right font-black tabular-nums text-slate-950 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">공모가</span>{formatWon(item.offerPrice)}</td>
            </tr>
          )) : <tr><td colSpan="5" className="px-4 py-10 text-center text-sm font-semibold text-slate-500">데이터 갱신 후 IPO 일정이 표시됩니다.</td></tr>}
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

function IpoDetail({ item, index, updatedAt }) {
  if (!item) return <Shell><PageHeader updatedAt={updatedAt} /><Panel title="일정을 찾을 수 없습니다" description="홈에서 다시 선택해 주세요."><a href="#/" className="inline-flex border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">홈으로</a></Panel></Shell>;
  return (
    <Shell>
      <PageHeader updatedAt={updatedAt} />
      <section className="border border-slate-200 bg-white px-5 py-5 md:px-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div><p className="text-sm font-semibold text-slate-500">IPO 일정 상세</p><h2 className="mt-1 break-keep text-3xl font-black tracking-tight text-slate-950">{normalizeText(item.companyName)}</h2><p className="mt-2 text-sm font-semibold text-slate-600">{normalizeText(item.reportName)} · {getIpoStatus(item)}</p></div>
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
  const [report, setReport] = useState(null);
  const [month, setMonth] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    Promise.all([readJson(IPO_DATA_URL, { metadata: {}, items: [] }), readJson(IPO_REPORT_URL, { lines: [] })]).then(([ipoData, reportData]) => {
      setPayload(ipoData);
      setReport(reportData);
    });
  }, []);

  const allItems = Array.isArray(payload?.items) ? payload.items : [];
  const events = buildEvents(allItems);
  const monthOptions = [...new Set(events.map((event) => String(event.date).slice(0, 7)).filter(Boolean))].sort().reverse();
  const filteredItems = allItems.filter((item) => {
    const itemMonth = String(item.scheduleStart || item.receiptDate || item.listingDate || '').slice(0, 7);
    const itemStatus = getIpoStatus(item);
    return (month === 'all' || itemMonth === month) && (status === 'all' || itemStatus.includes(status));
  });
  const detailItem = route.page === 'ipo' && route.detail ? allItems.find((item, index) => getIpoRouteId(item, index) === route.detail) : null;
  if (route.page === 'ipo' && route.detail) return <IpoDetail item={detailItem} index={allItems.indexOf(detailItem)} updatedAt={payload?.metadata?.updatedAt} />;

  const lines = Array.isArray(report?.lines) && report.lines.length ? report.lines : [
    countThisWeek(events, '청약') ? `이번 주 청약 일정은 ${countThisWeek(events, '청약')}건입니다.` : '이번 주 청약 일정이 수집되면 표시됩니다.',
    countThisWeek(events, '환불') ? `이번 주 환불 일정은 ${countThisWeek(events, '환불')}건입니다.` : '이번 주 환불 일정이 수집되면 표시됩니다.',
    '본 화면은 일정 확인용이며 투자 판단을 제공하지 않습니다.',
  ];

  return (
    <Shell>
      <PageHeader updatedAt={payload?.metadata?.updatedAt} />
      <section className="border border-slate-200 bg-white px-4 py-3 md:px-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label><span className="mb-1 block text-xs font-bold text-slate-600">월</span><select className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950" value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">전체</option>{monthOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label><span className="mb-1 block text-xs font-bold text-slate-600">구분</span><select className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">전체</option><option value="청약">청약</option><option value="상장">상장</option><option value="일정">일정 확인</option></select></label>
          <p className="text-xs font-semibold leading-5 text-slate-500">OpenDART 공시 기반</p>
        </div>
      </section>
      <InfoStrip items={[
        { label: '이번 주 청약', value: `${countThisWeek(events, '청약')}건`, detail: '청약 시작 기준' },
        { label: '이번 주 환불', value: `${countThisWeek(events, '환불')}건`, detail: '환불 예정일 기준' },
        { label: '이번 주 상장', value: `${countThisWeek(events, '상장')}건`, detail: '상장 예정일 기준' },
      ]} />
      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <Panel title="IPO 일정표" description="기업명을 누르면 공모 일정과 공시 정보를 확인할 수 있습니다.">
          <ScheduleTable items={filteredItems} />
        </Panel>
        <div className="space-y-5">
          <Panel title="월별 일정 현황" description="최근 일정이 몰린 달을 확인합니다."><HorizontalBars bars={monthlyBars(events)} /></Panel>
          <Panel title="요약" description="수집된 일정 기준의 짧은 정리입니다."><SummaryList lines={lines} /></Panel>
        </div>
      </section>
      <Panel title="구분별 일정 수" description="청약·환불·상장 일정 수를 비교합니다."><HorizontalBars bars={typeBars(events)} /></Panel>
      <footer className="border border-slate-200 bg-white px-5 py-4 text-center text-xs font-semibold text-slate-500">개인적 학습 목적으로 제작된 정적 데이터 사이트 · 투자 권유 목적이 아닙니다.</footer>
    </Shell>
  );
}
