import Pagination from './Pagination.jsx';
import { formatDate } from '../utils/dates.js';
import { normalizeStatus, STATUS_LABELS } from '../utils/status.js';
import { formatPrice } from '../utils/formatters.js';

export default function LatestOfferList({
  items,
  totalCount,
  todayLabel,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onItemSelect,
}) {
  const caption = isLoading
    ? '최근 공시를 불러오는 중입니다.'
    : `${totalCount.toLocaleString('ko-KR')}건 중 ${items.length.toLocaleString('ko-KR')}건 표시 · ${todayLabel} 기준`;

  return (
    <section className="list-section" aria-labelledby="latest-title">
      <div className="section-heading">
        <div>
          <h2 id="latest-title">최신 공모 공시</h2>
          <p>{caption}</p>
        </div>
        <div className="heading-side">
          <span className="today-badge">오늘 기준 {todayLabel}</span>
          <span className="sort-label">접수일 최신순</span>
        </div>
      </div>

      <div className="latest-grid">
        {isLoading ? <div className="empty-state">최근 공시를 불러오는 중입니다.</div> : null}
        {!isLoading && totalCount === 0 ? <div className="empty-state">표시할 최근 공시가 없습니다.</div> : null}
        {!isLoading && items.map((item, index) => {
          const status = normalizeStatus(item);
          const statusLabel = STATUS_LABELS[status] || '확인 필요';

          return (
            <button
              type="button"
              className="latest-offer-card"
              key={`${item.receiptNo || item.companyName}-${index}`}
              onClick={() => onItemSelect(item)}
            >
              <div className="latest-offer-card__head">
                <strong>{item.companyName || '-'}</strong>
                <small className={`status-${status}`}>{statusLabel}</small>
              </div>
              <p>{item.reportName || '증권신고서'}</p>
              <div className="latest-offer-card__meta">
                <span>접수일 {formatDate(item.receiptDate)}</span>
                <span>청약 {formatDate(item.scheduleStart || item.subscriptionDate)}</span>
                {item.listingDate ? <span>상장예정 {formatDate(item.listingDate)}</span> : null}
              </div>
              <div className="latest-offer-card__price">공모가 {formatPrice(item.offerPrice)}</div>
              <span className="card-detail-link">상세 보기</span>
            </button>
          );
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        itemLabel="최신 공모 공시"
      />
    </section>
  );
}
