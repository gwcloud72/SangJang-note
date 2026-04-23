import SummaryCard from './SummaryCard.jsx';
import { formatDateTime } from '../utils/dates.js';

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 일정' },
  { value: 'open', label: '진행중' },
  { value: 'upcoming', label: '예정' },
  { value: 'closed', label: '마감' },
  { value: 'unknown', label: '확인 필요' },
];

const SORT_OPTIONS = [
  { value: 'schedule', label: '청약일 빠른순' },
  { value: 'latest', label: '최신 공시순' },
];

export default function FinderPanel({
  keyword,
  status,
  sortOrder,
  summary,
  isLoading,
  error,
  onKeywordChange,
  onStatusChange,
  onSortOrderChange,
  onRefresh,
}) {
  return (
    <section id="finder" className="finder-card" aria-label="상장 일정 검색">
      <div className="finder-card__head">
        <div>
          <h2>상장 일정 노트</h2>
          <p>회사명, 공시명, 주관사, 가격, 경쟁률 키워드까지 검색하고 최신 공시순으로도 확인할 수 있습니다.</p>
        </div>
        <button id="refreshButton" type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? '불러오는 중' : '데이터 다시 불러오기'}
        </button>
      </div>

      <div className="filters" aria-label="검색 조건">
        <label>
          <span>회사명 검색</span>
          <input
            type="search"
            value={keyword}
            placeholder="회사명, 공시명, 주관사, 가격 입력"
            autoComplete="off"
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </label>
        <label>
          <span>진행 상태</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>정렬</span>
          <select value={sortOrder} onChange={(event) => onSortOrderChange(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="inline-alert">{error}</p> : null}

      <div className="summary-grid" aria-label="요약 정보">
        <SummaryCard label="전체 일정" value={summary.total} caption="공시 기반 일정" />
        <SummaryCard label="진행중" value={summary.open} caption="청약 기간 기준" />
        <SummaryCard label="예정" value={summary.upcoming} caption="청약 시작 전 일정" />
        <SummaryCard
          label="데이터"
          value={summary.source === 'OpenDART' ? 'API 연동' : '연동 대기'}
          caption={summary.updatedAt ? `갱신: ${formatDateTime(summary.updatedAt)}` : 'Actions 실행 전'}
        />
      </div>
    </section>
  );
}
