import ScheduleCard from './ScheduleCard.jsx';

const STATUS_FILTER_LABEL = {
  all: '전체 상태',
  open: '진행중',
  upcoming: '예정',
  closed: '마감',
  unknown: '확인 필요',
};

export default function ScheduleList({ items, totalCount, todayLabel, isLoading, selectedStatus }) {
  const caption = isLoading
    ? '조건에 맞는 데이터를 불러오는 중입니다.'
    : `${items.length.toLocaleString('ko-KR')}개 일정 표시 · ${todayLabel} 기준`;

  return (
    <section className="list-section" aria-labelledby="list-title">
      <div className="section-heading">
        <div>
          <h2 id="list-title">청약 일정 목록</h2>
          <p>{caption}</p>
        </div>
        <span className="sort-label">
          {STATUS_FILTER_LABEL[selectedStatus] || '전체 상태'} · 시작일순
        </span>
      </div>

      <div className="schedule-list" aria-live="polite">
        {isLoading ? <div className="empty-state">데이터를 불러오는 중입니다.</div> : null}
        {!isLoading && items.length === 0 ? (
          <div className="empty-state">
            조건에 맞는 상장 일정이 없습니다.
            {totalCount === 0 ? ' DART_API_KEY 등록 후 Actions를 실행하면 실제 데이터가 표시됩니다.' : ''}
          </div>
        ) : null}
        {!isLoading && items.map((item, index) => (
          <ScheduleCard key={`${item.receiptNo || item.companyName}-${index}`} item={item} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}
