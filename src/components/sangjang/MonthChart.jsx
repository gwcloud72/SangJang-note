import { useState } from 'react';
import { isPriorityDisclosure } from '../../lib/dashboardFilters.js';

function barHeightClass(value, max) {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.86) return 'h-[116px]';
  if (ratio >= 0.72) return 'h-[100px]';
  if (ratio >= 0.58) return 'h-[84px]';
  if (ratio >= 0.44) return 'h-[68px]';
  if (ratio >= 0.3) return 'h-[52px]';
  return 'h-[34px]';
}

function scheduleBadge(label) {
  if (label === '청약') return 'bg-blue-50 text-blue-700 ring-blue-100';
  if (label === '공시') return 'bg-orange-50 text-orange-700 ring-orange-100';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
}

function CalendarStrip({ selected }) {
  const days = [
    { day: '2일', type: '청약' },
    { day: '3일', type: '공시' },
    { day: '4일', type: '상장' },
    { day: '5일', type: '청약' },
    { day: '6일', type: selected ? '상장' : '공시' },
    { day: '7일', type: '공시' },
  ];
  return (
    <div className="mt-3 grid grid-cols-6 gap-1.5" aria-label="월간 일정 캘린더 미리보기">
      {days.map((item) => (
        <div key={`${item.day}-${item.type}`} className="rounded-lg border border-blue-100 bg-white text-center shadow-sm">
          <div className={`h-1.5 rounded-t-lg ${item.type === '청약' ? 'bg-blue-600' : item.type === '공시' ? 'bg-orange-400' : 'bg-emerald-500'}`} />
          <p className="pt-1 text-[11px] font-extrabold text-slate-700">{item.day}</p>
          <span className={`mb-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ring-1 ${scheduleBadge(item.type)}`}>{item.type}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ onReset }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-extrabold text-slate-950 md:text-[17px]">이번 달 일정</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">총 0건 · 우선 공시 0건</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">수집 대기</span>
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-sm font-bold text-slate-500">
        <svg viewBox="0 0 320 120" className="mx-auto mb-4 h-28 w-full max-w-[320px] text-slate-300" aria-hidden="true">
          <rect x="50" y="68" width="26" height="42" rx="8" fill="currentColor" opacity="0.42" />
          <rect x="96" y="48" width="26" height="62" rx="8" fill="currentColor" opacity="0.58" />
          <rect x="142" y="28" width="26" height="82" rx="8" fill="currentColor" opacity="0.78" />
          <rect x="188" y="58" width="26" height="52" rx="8" fill="currentColor" opacity="0.48" />
          <rect x="234" y="38" width="26" height="72" rx="8" fill="currentColor" opacity="0.64" />
        </svg>
        <p>월간 일정 데이터 수집 대기 중입니다.</p>
        <a href="#schedule" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white">전체 일정 보기</a>
      </div>
      <table className="sr-only"><caption>월간 IPO 일정 분포</caption><tbody /></table>
    </section>
  );
}

export default function MonthChart({ bars, currentLabel, items, variant = 'default', compact = false, featured = false, onReset }) {
  const [activeIndex, setActiveIndex] = useState(null);
  if (!bars.length) return <EmptyChart onReset={onReset} />;

  const max = Math.max(...bars.map((bar) => bar.scheduled + bar.done), 1);
  const total = bars.reduce((sum, bar) => sum + bar.scheduled + bar.done, 0);
  const busiest = bars.reduce((best, bar) => (bar.scheduled + bar.done > best.scheduled + best.done ? bar : best), bars[0]);
  const currentBar = bars.find((bar) => bar.label === currentLabel) || busiest;
  const priorityCount = items.filter(isPriorityDisclosure).length;
  const selected = bars[activeIndex] || currentBar;
  const isWide = variant === 'wide';

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-4 md:p-5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">그래프</p>
          <h2 className="mt-1 text-[16px] font-extrabold text-slate-950 md:text-[17px]">이번 달 일정 그래프</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">총 {total}건 · 우선 공시 {priorityCount}건</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">{currentLabel} 현재</span>
      </div>
      {selected && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700" aria-live="polite">
          {selected.label} · 예정 {selected.scheduled}건 · 완료 {selected.done}건 · 총 {selected.scheduled + selected.done}건
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-[11px] font-extrabold text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-blue-600" />현재 월</span>
        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-blue-100 ring-1 ring-blue-200" />월별 일정</span>
      </div>
      <div className={`mt-2 flex items-end gap-3 ${featured || isWide ? 'h-[162px]' : 'h-[126px]'}`} onMouseLeave={() => setActiveIndex(null)}>
        {bars.map((bar, index) => {
          const value = bar.scheduled + bar.done;
          const label = `${bar.label} 예정 ${bar.scheduled}건 완료 ${bar.done}건 총 ${value}건`;
          const isActive = selected?.label === bar.label;
          return (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className={`text-[11px] font-extrabold ${isActive || bar.label === currentLabel ? 'text-blue-700' : 'text-slate-400'}`}>{value}건</span>
              <button
                type="button"
                className={`flex w-full max-w-[34px] items-end justify-center rounded-t-xl transition ${barHeightClass(value, max)} ${bar.label === currentLabel ? 'bg-blue-600' : isActive ? 'bg-blue-400' : 'bg-blue-100'}`}
                aria-label={label}
                onClick={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
              >
                <span className={`mb-1 text-[10px] font-extrabold ${bar.label === currentLabel ? 'text-white' : 'text-blue-700'}`}>{value}건</span>
                <span className="sr-only">{label}</span>
              </button>
              <span className="text-[11px] font-bold text-slate-500">{bar.label}</span>
            </div>
          );
        })}
      </div>
      <CalendarStrip selected={selected} />
      <p className="mt-2 text-xs font-bold text-blue-600">현재 월 기준</p>
      <table className="sr-only">
        <caption>월간 IPO 일정 분포</caption>
        <tbody>{bars.map((bar) => <tr key={bar.label}><th scope="row">{bar.label}</th><td>{bar.scheduled + bar.done}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
