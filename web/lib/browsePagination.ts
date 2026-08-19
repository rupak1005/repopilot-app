const PAGE_SIZE = 20;
/** GitHub search only returns the first 1000 matches. */
const GITHUB_BROWSE_MAX = 1000;

export function browsePageSize(): number {
  return PAGE_SIZE;
}

export function browseTotalPages(totalCount: number): number {
  const capped = Math.min(totalCount, GITHUB_BROWSE_MAX);
  return Math.max(1, Math.ceil(capped / PAGE_SIZE));
}

/** Page numbers to render with optional ellipsis gaps. */
export function browseVisiblePages(current: number, total: number): Array<number | '…'> {
  if (total <= 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const core = new Set<number>([1, total, current]);
  if (current > 1) core.add(current - 1);
  if (current < total) core.add(current + 1);
  if (current <= 3) {
    core.add(2);
    core.add(3);
  }
  if (current >= total - 2) {
    core.add(total - 1);
    core.add(total - 2);
  }

  const sorted = [...core].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    if (index > 0 && page - sorted[index - 1] > 1) {
      out.push('…');
    }
    out.push(page);
  }
  return out;
}

export function browseResultRange(page: number, totalCount: number, itemCount: number): string {
  if (totalCount === 0 || itemCount === 0) return '0 results';
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = start + itemCount - 1;
  return `${start.toLocaleString()}–${end.toLocaleString()} of ${totalCount.toLocaleString()}`;
}
