import { dateRange, formatDate } from '../utils/dates.js';
import { dDay, normalizeStatus, STATUS_LABELS } from '../utils/status.js';

function getUnderwriters(item) {
  return Array.isArray(item.underwriters) && item.underwriters.length
    ? item.underwriters.join(', ')
    : '주관사 확인 필요';
}

export default function ScheduleCard({ item, rank }) {
  const status = normalizeStatus(item);
  const statusLabel = STATUS_LABELS[status] || '확인 필요';
  const hasDartUrl = Boolean(item.dartUrl);

  return (
    <article className="schedule-card">
      <span className="rank-badge">{rank}</span>

      <div className="schedule-main">
        <h3>{item.companyName || '-'}</h3>
        <div className="schedule-meta">
          <span>{item.reportName || '증권신고서'}</span>
          <span>{item.securityType || '증권 유형 확인 필요'}</span>
          <span>{getUnderwriters(item)}</span>
        </div>
      </div>

      <div className="date-block">
        <strong>{dateRange(item)}</strong>
        <small className={`status-${status}`}>{dDay(item)} · {statusLabel}</small>
        <div className="date-subline">납입 {formatDate(item.paymentDate)} · 배정 {formatDate(item.allotmentNoticeDate)}</div>
        {hasDartUrl ? (
          <a className="source-link" href={item.dartUrl} target="_blank" rel="noopener noreferrer">
            공시 원문 보기
          </a>
        ) : (
          <span className="disabled-link">원문 링크 없음</span>
        )}
      </div>
    </article>
  );
}
