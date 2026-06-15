export interface StatusBadgeProps {
  label: string;
}

export function StatusBadge({ label }: StatusBadgeProps) {
  const displayLabel = label.includes('상장') ? '상장' : label;
  const cls = label.includes('수요')
    ? 'bg-ipo-demand-bg text-ipo-demand-text'
    : label.includes('청약') || label.includes('환불')
      ? 'bg-ipo-subscribe-bg text-ipo-subscribe-text'
      : label.includes('상장')
        ? 'bg-ipo-listing-bg text-ipo-listing-text'
        : 'bg-ipo-review-bg text-ipo-review-text';
  return <span className={`inline-flex items-center rounded-full px-ds-1 py-ds-0.5 text-[11px] ${cls}`}>{displayLabel}</span>;
}
