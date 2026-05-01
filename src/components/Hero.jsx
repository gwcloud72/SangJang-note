import SummaryCard from './SummaryCard.jsx';

export default function Hero({ summary, todayLabel, isLoading }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__date">오늘 기준 {todayLabel}</div>
      <h1 id="hero-title" className="sr-only">공시 기반 IPO 일정 요약</h1>

      <div className="summary-grid" aria-label="상장 일정 요약">
        <SummaryCard label="전체" value={isLoading ? '-' : summary.total} />
        <SummaryCard label="진행" value={isLoading ? '-' : summary.open} tone="success" />
        <SummaryCard label="예정" value={isLoading ? '-' : summary.upcoming} tone="accent" />
        <SummaryCard label="마감" value={isLoading ? '-' : summary.closed} tone="muted" />
      </div>
    </section>
  );
}
