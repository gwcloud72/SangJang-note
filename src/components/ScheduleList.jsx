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
  schedule: '청약일순',
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
  const shouldShowPrimaryEmpty = !isLoading && items.length === 0;
  const countText = isAllStatus
    ? `진행/예정 ${primaryCount.toLocaleString('ko-KR')}건 · 마감 ${closedCount.toLocaleString('ko-KR')}건`
    : `${totalFilteredCount.toLocaleString('ko-KR')}건 표시`;

  return (
    <section id="schedule" className="schedule-section" aria-labelledby="list-title">
      <div className="section-heading">
        <div>
          <h2 id="list-title">청약 일정</h2>
          <p>{isLoading ? '공시 일정을 불러오는 중입니다.' : `${countText} · ${todayLabel} 기준`}</p>
        </div>
        <div className="section-chips" aria-label="현재 필터">
          <span>{STATUS_FILTER_LABEL[selectedStatus] || '전체 상태'}</span>
          <span>{SORT_LABEL[sortOrder] || '청약일순'}</span>
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
          <div className="empty-state">오늘 기준 진행중·예정 일정이 없어 지난 일정만 아래에 모아두었습니다.</div>
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
            <small>마감 일정은 하단에 따로 정리</small>
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
