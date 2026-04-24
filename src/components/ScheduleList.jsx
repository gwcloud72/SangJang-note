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
  schedule: '가까운 일정순',
  latest: '최신 공시순',
};

export default function ScheduleList({
  items,
  totalFilteredCount,
  totalCount,
  primaryCount,
  closedCount,
  closedItems,
  todayLabel,
  isLoading,
  selectedStatus,
  sortOrder,
  currentPage,
  totalPages,
  closedCurrentPage,
  closedTotalPages,
  onPageChange,
  onClosedPageChange,
  onItemSelect,
  pageSize,
}) {
  const isAllStatus = selectedStatus === 'all';
  const showClosedSection = !isLoading && isAllStatus && closedCount > 0;

  const caption = isLoading
    ? '조건에 맞는 데이터를 불러오는 중입니다.'
    : isAllStatus
      ? `${totalFilteredCount.toLocaleString('ko-KR')}개 일정 중 진행/예정 ${primaryCount.toLocaleString('ko-KR')}개 우선 표시 · 마감 ${closedCount.toLocaleString('ko-KR')}개는 아래에서 확인 · ${todayLabel} 기준`
      : `${totalFilteredCount.toLocaleString('ko-KR')}개 일정 중 ${items.length.toLocaleString('ko-KR')}개 표시 · ${todayLabel} 기준`;

  const shouldShowPrimaryEmpty = !isLoading && items.length === 0;

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
            {STATUS_FILTER_LABEL[selectedStatus] || '전체 상태'} · {SORT_LABEL[sortOrder] || '가까운 일정순'}
          </span>
          {isAllStatus ? <span className="sort-label sort-label--soft">마감 일정은 아래로 이동</span> : null}
        </div>
      </div>

      <div className="schedule-list" aria-live="polite">
        {isLoading ? <div className="empty-state">데이터를 불러오는 중입니다.</div> : null}
        {shouldShowPrimaryEmpty && totalFilteredCount === 0 ? (
          <div className="empty-state">
            조건에 맞는 상장 일정이 없습니다.
            {totalCount === 0 ? ' DART_API_KEY 등록 후 Actions를 실행하면 실제 데이터가 표시됩니다.' : ''}
          </div>
        ) : null}
        {shouldShowPrimaryEmpty && totalFilteredCount > 0 && isAllStatus ? (
          <div className="empty-state">
            오늘 기준 진행중·예정 일정이 없어 지난 일정만 아래에 모아두었습니다.
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

      {!isLoading && items.length > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          itemLabel="청약 일정"
        />
      ) : null}

      {showClosedSection ? (
        <details className="closed-schedule-panel">
          <summary>
            <span>지난 일정 {closedCount.toLocaleString('ko-KR')}건 보기</span>
            <small>마감된 종목은 여기에서 따로 확인</small>
          </summary>

          <div className="closed-schedule-panel__body">
            <div className="schedule-list schedule-list--closed">
              {closedItems.map((item, index) => (
                <ScheduleCard
                  key={`closed-${item.receiptNo || item.companyName}-${index}`}
                  item={item}
                  rank={(closedCurrentPage - 1) * pageSize + index + 1}
                  onSelect={onItemSelect}
                />
              ))}
            </div>

            <Pagination
              currentPage={closedCurrentPage}
              totalPages={closedTotalPages}
              onPageChange={onClosedPageChange}
              itemLabel="지난 일정"
            />
          </div>
        </details>
      ) : null}
    </section>
  );
}
