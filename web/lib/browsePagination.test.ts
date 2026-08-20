import { describe, expect, it } from 'vitest';
import { browseResultRange, browseTotalPages, browseVisiblePages, listTotalPages } from './browsePagination';

describe('browsePagination', () => {
  it('computes page windows with ellipsis', () => {
    expect(browseVisiblePages(1, 10)).toEqual([1, 2, 3, '…', 10]);
    expect(browseVisiblePages(5, 10)).toEqual([1, '…', 4, 5, 6, '…', 10]);
  });

  it('formats result ranges', () => {
    expect(browseResultRange(2, 100, 20)).toBe('21-40 of 100');
    expect(browseResultRange(1, 12, 5, 5)).toBe('1-5 of 12');
    expect(browseTotalPages(41)).toBe(3);
    expect(browseTotalPages(500_000)).toBe(50);
    expect(listTotalPages(12, 5)).toBe(3);
  });
});
