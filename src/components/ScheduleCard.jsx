import { toDateOnly } from '../utils/dates.js';
import { normalizeStatus, STATUS_LABELS } from '../utils/status.js';
import { formatAmount, formatPrice } from '../utils/formatters.js';


function compactDate(value) {
  const date = toDateOnly(value);
  if (!date) return value || '-';

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\s/g, '');
}

function compactDateRange(item) {
  if (item.scheduleStart && item.scheduleEnd && item.scheduleStart !== item.scheduleEnd) {
    return `${compactDate(item.scheduleStart)} ~ ${compactDate(item.scheduleEnd)}`;
  }

  if (item.scheduleStart) return compactDate(item.scheduleStart);
  return item.subscriptionDate || '정정 공시 확인';
}

const ACTION_LABEL = {
  open: '공시 원문 보기',
  upcoming: '상세 일정',
  closed: '공시 원문 보기',
  unknown: '정정 공시 확인',
};

export default function ScheduleCard({ item, onSelect }) {
  const status = normalizeStatus(item);
  const statusLabel = STATUS_LABELS[status] || '확인 필요';
  const actionLabel = ACTION_LABEL[status] || '상세 보기';

  return (
    <button type="button" className={`schedule-card schedule-card--${status}`} onClick={() => onSelect(item)}>
      <div className="schedule-card__company">
        <div className="schedule-card__title-row">
          <h3>{item.companyName || '-'}</h3>
          <span className={`status-badge status-badge--${status}`}>{statusLabel}</span>
        </div>
        <p>{item.reportName || '증권신고서'} · {item.securityType || '지분증권'}</p>
      </div>

      <dl className="schedule-card__facts">
        <div>
          <dt>청약일</dt>
          <dd>{compactDateRange(item)}</dd>
        </div>
        <div>
          <dt>공모가</dt>
          <dd>{formatPrice(item.offerPrice)}</dd>
        </div>
        <div>
          <dt>공모총액</dt>
          <dd>{formatAmount(item.offerAmount)}</dd>
        </div>
      </dl>

      <div className="schedule-card__action">
        <span>{actionLabel}</span>
        <b aria-hidden="true">›</b>
      </div>
    </button>
  );
}
