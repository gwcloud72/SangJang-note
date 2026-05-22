import { useState } from 'react';
import { SORT_OPTIONS } from '../../lib/dashboardFilters.js';

const resetButton = 'rounded-xl border border-slate-300 bg-white font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45';
const control = 'h-10 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100';
const mobileControl = 'h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100';
const mobileAction = 'h-11 shrink-0 rounded-xl px-3 text-[13px] font-extrabold transition';

function SearchBox({ value, onChange, id, compact = false }) {
  return (
    <label className={compact ? 'sr-only' : 'grid gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400'} htmlFor={id}>
      기업명 검색
      <input
        id={id}
        aria-label="기업명, 공시명, 주관사 검색"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="기업명, 공시명, 주관사"
        className="h-10 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold normal-case tracking-normal text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
      {label}
      {children}
    </label>
  );
}

export default function Toolbar({ filters, setFilter, reset, canReset, markets, resultCount, dataSourceLabel }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const detailId = 'ipo-mobile-bottom-sheet';
  return (
    <section aria-label="IPO 검색" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div className="hidden gap-3 md:grid md:grid-cols-[1fr_0.95fr_0.85fr_1fr_0.95fr_92px]">
        <SearchBox value={filters.query} onChange={(value) => setFilter('query', value)} id="ipo-desktop-query" />
        <Field label="시장 선택"><select aria-label="시장 선택" value={filters.market} onChange={(event) => setFilter('market', event.target.value)} className={control}><option>전체 시장</option>{markets.map((market) => <option key={market}>{market}</option>)}</select></Field>
        <Field label="상태 선택"><select aria-label="상태 선택" value={filters.status} onChange={(event) => setFilter('status', event.target.value)} className={control}><option>전체</option><option>청약 진행</option><option>청약 예정</option><option>상장 예정</option><option>상장 완료</option></select></Field>
        <Field label="기간 선택"><select aria-label="기간 선택" value={filters.period} onChange={(event) => setFilter('period', event.target.value)} className={control}><option>이번 달</option><option>전체</option></select></Field>
        <Field label="정렬 선택"><select aria-label="정렬 선택" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)} className={control}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <button type="button" onClick={reset} disabled={!canReset} aria-label="IPO 검색 조건 초기화" className={`mt-auto h-10 px-3 text-[13px] ${resetButton}`}>초기화</button>
      </div>
      <div className="md:hidden">
        <div className="flex items-center gap-2">
          <input
            id="ipo-mobile-query"
            aria-label="기업명, 공시명, 주관사 검색"
            value={filters.query}
            onChange={(event) => setFilter('query', event.target.value)}
            placeholder="기업명, 공시명, 주관사"
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          <button type="button" aria-expanded={detailOpen} aria-controls={detailId} onClick={() => setDetailOpen(true)} className={`${mobileAction} border border-blue-200 bg-blue-50 text-blue-800`}>필터</button>
          <button type="button" onClick={reset} disabled={!canReset} aria-label="IPO 검색 조건 초기화" className={`${mobileAction} ${resetButton}`}>초기화</button>
        </div>
        {canReset && <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-extrabold text-blue-800" aria-label="적용된 IPO 필터">
          {filters.market !== '전체 시장' && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 ring-1 ring-blue-100">{filters.market}</span>}
          {filters.status !== '전체' && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 ring-1 ring-blue-100">{filters.status}</span>}
          {filters.period !== '이번 달' && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 ring-1 ring-blue-100">{filters.period}</span>}
          {filters.sort !== 'subscription-asc' && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 ring-1 ring-blue-100">정렬 변경</span>}
        </div>}
        {detailOpen && (
          <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-modal="true" aria-labelledby="ipo-mobile-filter-title">
            <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="상세 필터 닫기" onClick={() => setDetailOpen(false)} />
            <div id={detailId} className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="ipo-mobile-filter-title" className="text-base font-black text-slate-950">상세 필터</h2>
                <button type="button" onClick={() => setDetailOpen(false)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">닫기</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="시장 선택" value={filters.market} onChange={(event) => setFilter('market', event.target.value)} className={mobileControl}><option>전체 시장</option>{markets.map((market) => <option key={market}>{market}</option>)}</select>
                <select aria-label="상태 선택" value={filters.status} onChange={(event) => setFilter('status', event.target.value)} className={mobileControl}><option>전체</option><option>청약 진행</option><option>청약 예정</option><option>상장 예정</option><option>상장 완료</option></select>
                <select aria-label="기간 선택" value={filters.period} onChange={(event) => setFilter('period', event.target.value)} className={mobileControl}><option>이번 달</option><option>전체</option></select>
                <select aria-label="정렬 선택" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)} className={mobileControl}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="mt-3 h-11 w-full rounded-xl bg-blue-600 text-sm font-extrabold text-white">적용</button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs font-bold text-slate-500 md:mt-3" aria-live="polite">조회 결과 {resultCount}건 · {dataSourceLabel}</p>
    </section>
  );
}
