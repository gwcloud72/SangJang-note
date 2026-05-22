import { useEffect, useState } from 'react';
import { isPriorityDisclosure, priorityLabel, safeExternalUrl } from '../../lib/dashboardFilters.js';

function NoticeBadge({ tone, children }) {
  const classes = tone === 'blue'
    ? 'bg-blue-600 text-white'
    : tone === 'orange'
      ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
      : 'bg-slate-100 text-slate-600';
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${classes}`}>{children}</span>;
}

function NoticeGroup({ label, tone, items, wide }) {
  return (
    <div>
      <p className={`mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] ${tone === 'blue' ? 'text-blue-600' : 'text-orange-500'}`}>{label}</p>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {items.map((item) => {
          const url = safeExternalUrl(item.dartUrl);
          return (
            <div key={`${label}-${item.id}-${item.filingType}`} className={`grid items-center gap-3 px-3 py-2.5 ${wide ? 'grid-cols-[minmax(0,1fr)_120px]' : 'grid-cols-[minmax(0,1fr)_auto]'}`}>
              <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-700"><NoticeBadge tone={tone === 'blue' ? 'blue' : 'orange'}>{tone === 'blue' ? priorityLabel(item) : '공시'}</NoticeBadge><span className="line-clamp-1 min-w-0">{item.filingType}</span></p>
                <p className="mt-1 line-clamp-2 text-sm font-extrabold text-slate-900">{item.company}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.filingNote} · {item.updatedAt}</p>
              </div>
              {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-extrabold text-slate-700">원문</a> : <span className="text-xs font-bold text-slate-400">대기</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyDisclosure() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      <svg viewBox="0 0 48 48" className="mx-auto mb-3 size-11 text-slate-300" aria-hidden="true"><path d="M14 6h16l8 8v28H14z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /><path d="M30 6v9h8M19 23h14M19 30h12M19 37h8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      <p>확인할 공시가 없습니다.</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">전체 일정을 확인하면 공시 후보를 다시 볼 수 있습니다.</p>
      <a href="#home" className="mt-4 inline-grid h-9 place-items-center rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700">전체 일정 보기</a>
    </div>
  );
}

function LoadMore({ visibleCount, totalCount, onClick }) {
  if (visibleCount >= totalCount) return null;
  return (
    <div className="mt-4 flex justify-center">
      <button type="button" onClick={onClick} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="공시 더 보기">
        더 보기 <span className="ml-1 text-slate-400">{visibleCount}/{totalCount}</span>
      </button>
    </div>
  );
}

export default function DisclosurePanel({ items, variant = 'default', compact = false }) {
  const isWide = variant === 'wide';
  const initialCount = isWide ? 10 : 6;
  const [visibleCount, setVisibleCount] = useState(initialCount);
  useEffect(() => { setVisibleCount(initialCount); }, [items.length, initialCount]);
  const priorityAll = items.filter(isPriorityDisclosure);
  const generalAll = items.filter((item) => !isPriorityDisclosure(item));
  const priority = priorityAll.slice(0, Math.min(priorityAll.length, visibleCount));
  const general = generalAll.slice(0, Math.max(0, visibleCount - priority.length));
  const totalCount = priorityAll.length + generalAll.length;
  const handleMore = () => setVisibleCount((count) => Math.min(count + initialCount, totalCount));
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-4 md:p-5'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">공시</p>
          <h2 className="mt-1 text-[16px] font-extrabold text-slate-950 md:text-[17px]">공시 모아보기</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500">{totalCount}건</span>
      </div>
      {priority.length || general.length ? (
        <>
          <div className={`mt-3 gap-3 ${isWide ? 'grid md:grid-cols-2' : 'space-y-3'}`}>
            {priority.length > 0 && <NoticeGroup label="우선 확인" tone="blue" items={priority} wide={isWide} />}
            {general.length > 0 && <NoticeGroup label="일반 공시" tone="orange" items={general} wide={isWide} />}
          </div>
          <LoadMore visibleCount={priority.length + general.length} totalCount={totalCount} onClick={handleMore} />
        </>
      ) : <EmptyDisclosure />}
    </section>
  );
}
