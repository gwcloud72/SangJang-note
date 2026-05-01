const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'open', label: '진행중' },
  { value: 'upcoming', label: '예정' },
  { value: 'closed', label: '마감' },
  { value: 'unknown', label: '확인 필요' },
];

const SORT_OPTIONS = [
  { value: 'schedule', label: '청약일순' },
  { value: 'latest', label: '최신 공시순' },
];

export default function FinderPanel({
  keyword,
  status,
  sortOrder,
  error,
  onKeywordChange,
  onStatusChange,
  onSortOrderChange,
}) {
  return (
    <section id="finder" className="finder-panel" aria-label="상장 일정 검색과 필터">
      <label className="search-field">
        <span className="sr-only">회사명 검색</span>
        <span className="search-field__icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={keyword}
          placeholder="회사명으로 검색"
          autoComplete="off"
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </label>

      <label className="select-field">
        <span className="sr-only">진행 상태</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label className="select-field">
        <span className="sr-only">정렬</span>
        <select value={sortOrder} onChange={(event) => onSortOrderChange(event.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>정렬: {option.label}</option>
          ))}
        </select>
      </label>

      {error ? <p className="inline-alert">{error}</p> : null}
    </section>
  );
}
