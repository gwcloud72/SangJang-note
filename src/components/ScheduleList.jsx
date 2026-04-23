import Pagination from './Pagination.jsx';
import ScheduleCard from './ScheduleCard.jsx';

const STATUS_FILTER_LABEL = {
  all: '전체 상태',
  open: '진행중',
  upcoming: '예정',
  closed: '마감',
  unknown: '확인 필요',
};

const SORT_LABEL = {
  schedule: '청약일 빠른순',
  latest: '최신 공시순',
};

export default function ScheduleList({
  items,
  totalFilteredCount,
  totalCount,
  todayLabel,
  isLoading,
  selectedStatus,
  sortOrder,
  currentPage,
  totalPages,
  onPageChange,
  onItemSelect,
  pageSize,
}) {
  const caption = isLoading
    ? '조건에 맞는 데이터를 불러오는 중입니다.'
    : `${totalFilteredCount.toLocaleString('ko-KR')}개 일정 중 ${items.length.toLocaleString('ko-KR')}개 표시 · ${todayLabel} 기준`;

  return (
    <section className="list-section" aria-labelledby="list-title">
      <div className="section-heading">
        <div>
          <h2 id="list-title">청약 일정 목록</h2>
          <p>{caption}</p>
        </div>
        <div className="heading-side">
          <span className="today-badge">오늘 기준 {todayLabel}</span>
          <span className="sort-label">
            {STATUS_FILTER_LABEL[selectedStatus] || '전체 상태'} · {SORT_LABEL[sortOrder] || '청약일 빠른순'}
          </span>
        </div>
      </div>

      <div className="schedule-list" aria-live="polite">
        {isLoading ? <div className="empty-state">데이터를 불러오는 중입니다.</div> : null}
        {!isLoading && totalFilteredCount === 0 ? (
          <div className="empty-state">
            조건에 맞는 상장 일정이 없습니다.
            {totalCount === 0 ? ' DART_API_KEY 등록 후 Actions를 실행하면 실제 데이터가 표시됩니다.' : ''}
          </div>
        ) : null}
        {!isLoading && items.map((item, index) => (
          <ScheduleCard
            key={`${item.receiptNo || item.companyName}-${index}`}
            item={item}
            rank={(currentPage - 1) * pageSize + index + 1}
            onSelect={onItemSelect}
          />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        itemLabel="청약 일정"
      />
    </section>
  );
}
