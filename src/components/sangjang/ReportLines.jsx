function EmptyMarketSkeleton() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-7 text-center text-sm font-bold text-slate-500">
      <svg viewBox="0 0 360 140" className="mx-auto mb-4 h-32 w-full max-w-[360px] text-slate-300" aria-hidden="true">
        <line x1="36" y1="22" x2="324" y2="22" stroke="currentColor" opacity="0.35" />
        <line x1="36" y1="70" x2="324" y2="70" stroke="currentColor" opacity="0.35" />
        <line x1="36" y1="118" x2="324" y2="118" stroke="currentColor" opacity="0.35" />
        <rect x="54" y="76" width="28" height="42" rx="8" fill="currentColor" opacity="0.45" />
        <rect x="102" y="52" width="28" height="66" rx="8" fill="currentColor" opacity="0.62" />
        <rect x="150" y="34" width="28" height="84" rx="8" fill="currentColor" opacity="0.82" />
        <rect x="198" y="64" width="28" height="54" rx="8" fill="currentColor" opacity="0.5" />
        <rect x="246" y="46" width="28" height="72" rx="8" fill="currentColor" opacity="0.68" />
      </svg>
      <p>일정 요약 생성 대기 중입니다.</p>
      <a href="#schedule" className="mt-4 inline-grid h-9 place-items-center rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700">전체 일정 보기</a>
    </div>
  );
}

export default function ReportLines({ lines, variant = 'default', compact = false, title = 'AI 리포트', eyebrow = '일정 요약' }) {
  const isDocument = variant === 'document';
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${isDocument ? 'p-6 md:p-7' : compact ? 'p-4' : 'p-5'}`}>
      <div className={isDocument ? 'mx-auto max-w-[820px]' : ''}>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">{eyebrow}</p>
        <h2 className={`${isDocument ? 'mt-2 text-2xl' : 'mt-1 text-lg'} font-extrabold text-slate-950`}>{title}</h2>
        <div className={`${isDocument ? 'mt-5 space-y-4' : 'mt-4 space-y-3'}`}>
          {lines.length ? lines.map((line) => <p key={line} className={`${isDocument ? 'rounded-2xl border border-slate-100 bg-white px-5 py-4 text-[15px] leading-7' : 'rounded-xl bg-slate-50 px-4 py-3 text-sm'} font-bold text-slate-700`}>{line}</p>) : <EmptyMarketSkeleton />}
        </div>
      </div>
    </section>
  );
}
