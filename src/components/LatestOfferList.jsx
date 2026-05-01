import Pagination from './Pagination.jsx';
import { formatDate } from '../utils/dates.js';

export default function LatestOfferList({
  items,
  totalCount,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onItemSelect,
}) {
  return (
    <section id="latest" className="sidebar-card latest-card" aria-labelledby="latest-title">
      <div className="sidebar-card__head">
        <h2 id="latest-title">최신 공시</h2>
        <span>{isLoading ? '확인중' : `${totalCount.toLocaleString('ko-KR')}건`}</span>
      </div>

      <div className="latest-list">
        {isLoading ? <div className="sidebar-empty">최근 공시를 불러오는 중입니다.</div> : null}
        {!isLoading && totalCount === 0 ? <div className="sidebar-empty">표시할 최근 공시가 없습니다.</div> : null}
        {!isLoading && items.map((item, index) => (
          <button
            type="button"
            className="latest-offer-item"
            key={`${item.receiptNo || item.companyName}-${index}`}
            onClick={() => onItemSelect(item)}
          >
            <span className="document-icon" aria-hidden="true">□</span>
            <span>
              <strong>{item.reportName || '증권신고서 제출'}</strong>
              <small>{item.companyName || '-'} · {formatDate(item.receiptDate)}</small>
            </span>
          </button>
        ))}
      </div>

      {!isLoading && totalCount > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          itemLabel="최신 공시"
        />
      ) : null}
    </section>
  );
}
