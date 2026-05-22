import { getEventDates } from '../../lib/ipoData.js';

function helperClass(helper) {
  if (helper === '청약') return 'bg-blue-50 text-blue-700 ring-1 ring-blue-100';
  if (helper === '공시') return 'bg-orange-50 text-orange-700 ring-1 ring-orange-100';
  if (helper === '상장') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
  return 'bg-slate-100 text-slate-600';
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function weekdayLabel(date) {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}

function typeClass(type) {
  if (type === '청약') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (type === '공시') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (type === '상장') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

function weekTopLineClass(type) {
  if (type === '청약') return 'bg-blue-600';
  if (type === '공시') return 'bg-orange-400';
  if (type === '상장') return 'bg-emerald-500';
  return 'bg-slate-200';
}

function eventType(item) {
  const text = `${item?.status || ''} ${item?.filingType || ''} ${item?.priority || ''}`;
  if (/공시|정정|수요|증권/.test(text)) return '공시';
  if (/상장/.test(text)) return '상장';
  if (/청약|진행/.test(text)) return '청약';
  return '일정';
}

function buildWeekDays(items, referenceDate) {
  const base = startOfDay(referenceDate || new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(base, index);
    const events = (items || [])
      .filter((item) => getEventDates(item, referenceDate).some((eventDate) => sameDay(eventDate, date)))
      .slice(0, 2);
    return {
      key: date.toISOString(),
      date,
      day: date.getDate(),
      weekday: weekdayLabel(date),
      events,
      type: events[0] ? eventType(events[0]) : '일정',
    };
  });
}

function MobileWeekCalendar({ items, referenceDate }) {
  const weekDays = buildWeekDays(items, referenceDate);
  return (
    <div className="mt-3 md:hidden" aria-label="모바일 주간 일정">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-extrabold text-slate-700">주간 달력</span>
        <span className="text-[11px] font-bold text-slate-400">좌우로 보기</span>
      </div>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {weekDays.map((day) => {
          const primary = day.events[0];
          return (
            <div key={day.key} className="min-w-[74px] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className={`h-1.5 ${weekTopLineClass(day.type)}`} />
              <div className="px-3 py-2 text-center">
                <p className="text-[11px] font-black text-slate-400">{day.weekday}</p>
                <p className="mt-1 text-[18px] font-black leading-none text-slate-950">{day.day}</p>
                {primary ? (
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${typeClass(day.type)}`}>{day.type}</span>
                ) : (
                  <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-400">대기</span>
                )}
                <p className="mt-1 truncate text-[10px] font-bold text-slate-500">{primary?.company || '일정 없음'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Summary({ stats, items = [], referenceDate }) {
  const next = stats.next;
  const nextCompany = next?.company || '확인할 일정 없음';
  const nextWindow = next?.subscription || next?.listing || '-';
  const checkCards = [
    { label: '청약 진행', value: stats.active, suffix: '건', helper: '청약' },
    { label: '공시 확인', value: stats.filings, suffix: '건', helper: '공시' },
    { label: '상장 예정', value: stats.upcoming, suffix: '건', helper: '상장' },
  ];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-blue-600">이번 달 일정</p>
          <h1 className="mt-2 text-[18px] font-extrabold leading-snug tracking-tight text-slate-950 md:text-[22px]">
            청약 {stats.active}건 · 공시 {stats.filings}건 · 상장 {stats.upcoming}건
          </h1>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold text-slate-400">가장 가까운 일정</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <strong className="text-[15px] font-extrabold text-slate-950">{nextCompany}</strong>
              <span className="text-[12px] font-bold text-slate-500">{nextWindow}</span>
            </div>
          </div>
          <MobileWeekCalendar items={items} referenceDate={referenceDate} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {checkCards.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">{item.label}</span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-extrabold ${helperClass(item.helper)}`}>{item.helper}</span>
              </div>
              <p className="mt-2 text-[22px] font-extrabold leading-none text-slate-950">{item.value}<span className="ml-1 text-xs font-bold text-slate-400">{item.suffix}</span></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
