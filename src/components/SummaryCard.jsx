export default function SummaryCard({ label, value, tone = 'default' }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('ko-KR') : value;

  return (
    <article className={`summary-card summary-card--${tone}`}>
      <span>{label}</span>
      <strong>{displayValue}</strong>
    </article>
  );
}
