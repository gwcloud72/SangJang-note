export default function SummaryCard({ label, value, caption }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('ko-KR') : value;

  return (
    <article className="summary-card">
      <span className="summary-card__label">{label}</span>
      <strong>{displayValue}</strong>
      <small>{caption}</small>
    </article>
  );
}
