function buildPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('left-ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('right-ellipsis');

  pages.push(totalPages);
  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemLabel = '목록',
}) {
  if (totalPages <= 1) return null;

  const pages = buildPages(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label={`${itemLabel} 페이지 이동`}>
      <button
        type="button"
        className="page-button page-button--nav"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        이전
      </button>

      <div className="page-number-group">
        {pages.map((page, index) => {
          if (typeof page !== 'number') {
            return <span key={`${page}-${index}`} className="page-ellipsis">…</span>;
          }

          return (
            <button
              key={page}
              type="button"
              className={`page-button ${page === currentPage ? 'is-active' : ''}`}
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="page-button page-button--nav"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        다음
      </button>
    </nav>
  );
}
