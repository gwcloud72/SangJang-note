import { dateRange, formatDate } from '../utils/dates.js';
import { dDay, normalizeStatus, STATUS_LABELS } from '../utils/status.js';
import { formatAmount, formatPrice, formatTextList } from '../utils/formatters.js';

export default function ScheduleCard({ item, rank, onSelect }) {
  const status = normalizeStatus(item);
  const statusLabel = STATUS_LABELS[status] || '확인 필요';
  const dateSubline = item.refundDate
    ? `납입 ${formatDate(item.paymentDate)} · 환불 ${formatDate(item.refundDate)}`
    : `납입 ${formatDate(item.paymentDate)} · 배정 ${formatDate(item.allotmentNoticeDate)}`;

  return (
    <button type="button" className={`schedule-card schedule-card--${status}`} onClick={() => onSelect(item)}>
      <span className="rank-badge">{rank}</span>

      <div className="schedule-main">
        <div className="schedule-title-row">
          <h3>{item.companyName || '-'}</h3>
          <span className={`inline-status-chip inline-status-chip--${status}`}>{statusLabel}</span>
        </div>
        <div className="schedule-meta">
          <span>{item.reportName || '증권신고서'}</span>
          <span>{item.securityType || '증권 유형 확인 필요'}</span>
          <span>{formatTextList(item.underwriters, '주관사 확인 필요')}</span>
        </div>
        <div className="schedule-extra">
          <span>공모가 {formatPrice(item.offerPrice)}</span>
          <span>공모총액 {formatAmount(item.offerAmount)}</span>
          <span>접수일 {formatDate(item.receiptDate)}</span>
        </div>
      </div>

      <div className="date-block">
        <strong>{dateRange(item)}</strong>
        <small className={`status-${status}`}>{dDay(item)} · {statusLabel}</small>
        <div className="date-subline">{dateSubline}</div>
        <span className="card-detail-link">상세 보기</span>
      </div>
    </button>
  );
}
