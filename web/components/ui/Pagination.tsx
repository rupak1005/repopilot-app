import { browseVisiblePages } from '../../lib/browsePagination';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label: string;
};

export function Pagination({ page, totalPages, onPageChange, label }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pageItems = browseVisiblePages(page, totalPages);

  return (
    <nav className="browse-pagination" aria-label={label}>
      <button
        type="button"
        className="browse-pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous
      </button>
      <ol className="browse-pagination__pages">
        {pageItems.map((item, index) =>
          item === '…' ? (
            <li key={`gap-${index}`} className="browse-pagination__gap" aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`browse-pagination__page${item === page ? ' browse-pagination__page--active' : ''}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ol>
      <button
        type="button"
        className="browse-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        Next
      </button>
    </nav>
  );
}
