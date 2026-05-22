import { useEffect, useState } from 'react';
import { statusClass } from '../../lib/ipoData.js';
import { safeExternalUrl } from '../../lib/dashboardFilters.js';

const PAGE_SIZE = 8;

function DocumentIcon() {
  return (
    <svg viewBox="0 0 48 48" className="mx-auto mb-3 size-12 text-blue-200" aria-hidden="true">
      <path d="M15 5h15l8 8v30H15z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 5v9h8M20 24h18M20 31h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EmptyState({ action, actionLabel = '전체 일정 보기', label = '조건에 맞는 일정이 없습니다.' }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <DocumentIcon />
      <p className="text-sm font-extrabold text-slate-600">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">전체 일정으로 돌아가면 다시 탐색할 수 있습니다.</p>
      {action && <button type="button" onClick={action} aria-label={actionLabel} className="mt-4 h-9 rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-white shadow-sm shadow-blue-900/10">
        {actionLabel}
      </button>}
    </div>
  );
}

function IpoRow({ item, favorites }) {
  const isFavorite = favorites?.has(item.id);
  const dartUrl = safeExternalUrl(item.dartUrl);
  return (
    <tr className="hover:bg-slate-50">
      <td className="min-w-0 px-2 py-[8px]">
        <p className="line-clamp-2 font-extrabold text-slate-950">{item.company}</p>
        <p className="mt-1 truncate text-[11px] font-bold text-slate-400">{item.market}</p>
      </td>
      <td className="whitespace-nowrap px-2 py-[8px] font-semibold text-slate-600">{item.subscription}</td>
      <td className="whitespace-nowrap px-2 py-[8px] font-semibold text-slate-600">{item.refund}</td>
      <td className="whitespace-nowrap px-2 py-[8px] font-semibold text-slate-600">{item.listing}</td>
      <td className="whitespace-nowrap px-2 py-[8px] font-extrabold text-slate-900">{item.price}</td>
      <td className="min-w-0 px-2 py-[8px] font-semibold text-slate-600"><p className="line-clamp-2">{item.manager}</p></td>
      <td className="px-2 py-[8px]"><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-extrabold ${statusClass(item.status)}`}>{item.status}</span></td>
      <td className="px-2 py-[8px] text-center">{dartUrl ? <a href={dartUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-extrabold text-blue-600">원문</a> : <span className="text-[11px] font-bold text-slate-400">대기</span>}</td>
      <td className="px-2 py-[8px] text-center">
        <button type="button" onClick={() => favorites?.toggle(item.id)} aria-label={`${item.company} 관심기업 토글`} aria-pressed={isFavorite} className="text-[11px] font-extrabold text-slate-600">{isFavorite ? '저장' : '＋'}</button>
      </td>
    </tr>
  );
}

function IpoCard({ item, favorites }) {
  const isFavorite = favorites?.has(item.id);
  const dartUrl = safeExternalUrl(item.dartUrl);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 font-extrabold text-slate-950">{item.company}</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-400">{item.market} · {item.manager}</p>
        </div>
        <span className={`h-fit shrink-0 rounded-full border px-2 py-1 text-xs font-bold ${statusClass(item.status)}`}>{item.status}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold">
        <div><dt className="text-slate-400">청약</dt><dd className="mt-1 text-slate-800">{item.subscription}</dd></div>
        <div><dt className="text-slate-400">환불</dt><dd className="mt-1 text-slate-800">{item.refund}</dd></div>
        <div><dt className="text-slate-400">상장</dt><dd className="mt-1 text-slate-800">{item.listing}</dd></div>
        <div><dt className="text-slate-400">공모가</dt><dd className="mt-1 text-slate-800">{item.price}</dd></div>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {dartUrl ? <a href={dartUrl} target="_blank" rel="noopener noreferrer" className="grid h-9 place-items-center rounded-xl border border-slate-200 text-xs font-extrabold text-slate-700">공시 원문</a> : <span className="grid h-9 place-items-center rounded-xl border border-slate-200 text-xs font-bold text-slate-400">공시 대기</span>}
        <button type="button" onClick={() => favorites?.toggle(item.id)} aria-label={`${item.company} 관심기업 토글`} aria-pressed={isFavorite} className={`h-9 rounded-xl text-xs font-extrabold ${isFavorite ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700'}`}>{isFavorite ? '저장됨' : '관심 저장'}</button>
      </div>
    </article>
  );
}

function LoadMore({ visibleCount, totalCount, onClick }) {
  if (visibleCount >= totalCount) return null;
  return (
    <div className="mt-4 flex justify-center">
      <button type="button" onClick={onClick} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="IPO 일정 더 보기">
        더 보기 <span className="ml-1 text-slate-400">{visibleCount}/{totalCount}</span>
      </button>
    </div>
  );
}

export default function IpoTable({ rows, favorites, reset, canReset, title = 'IPO 일정', emptyLabel, onEmptyAction, emptyActionLabel }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [rows.length, title]);
  const visibleRows = rows.filter((_, index) => index < visibleCount);
  const handleMore = () => setVisibleCount((count) => Math.min(count + PAGE_SIZE, rows.length));
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
        <div>
          <h2 className="text-[16px] font-extrabold tracking-tight text-slate-950 md:text-[17px]">{title}</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">청약 · 환불 · 상장 순서로 확인</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500">{rows.length}건</span>
      </div>
      {!rows.length ? <EmptyState action={onEmptyAction || reset} label={emptyLabel || '조건에 맞는 일정이 없습니다.'} actionLabel={emptyActionLabel || (canReset ? '조건 초기화' : '전체 일정 보기')} /> : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
            <table className="w-full table-fixed text-left text-[12px]">
              <caption className="sr-only">IPO 일정 목록</caption>
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500">
                <tr>
                  <th className="w-[14%] px-2 py-2">기업명</th>
                  <th className="w-[17%] px-2 py-2">청약 기간</th>
                  <th className="w-[10%] px-2 py-2">환불일</th>
                  <th className="w-[11%] px-2 py-2">상장 예정</th>
                  <th className="w-[13%] px-2 py-2">공모가</th>
                  <th className="w-[13%] px-2 py-2">주관사</th>
                  <th className="w-[9%] px-2 py-2">상태</th>
                  <th className="w-[7%] px-2 py-2 text-center">공시</th>
                  <th className="w-[6%] px-2 py-2 text-center">관심</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((item) => <IpoRow key={item.id} item={item} favorites={favorites} />)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {visibleRows.map((item) => <IpoCard key={item.id} item={item} favorites={favorites} />)}
          </div>
          <LoadMore visibleCount={visibleRows.length} totalCount={rows.length} onClick={handleMore} />
        </>
      )}
    </section>
  );
}
