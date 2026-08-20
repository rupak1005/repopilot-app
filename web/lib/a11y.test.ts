import { describe, expect, it, vi } from 'vitest';
import { isActivationKey, MAIN_CONTENT_ID, rowLinkProps } from './a11y';

describe('a11y', () => {
  it('exports a stable main content id for skip links', () => {
    expect(MAIN_CONTENT_ID).toBe('main-content');
  });

  it('treats Enter and Space as activation keys', () => {
    expect(isActivationKey('Enter')).toBe(true);
    expect(isActivationKey(' ')).toBe(true);
    expect(isActivationKey('Tab')).toBe(false);
  });

  it('activates row links on click and keyboard', () => {
    const onActivate = vi.fn();
    const props = rowLinkProps(onActivate);
    expect(props.role).toBe('link');
    expect(props.tabIndex).toBe(0);
    props.onClick();
    props.onKeyDown({ key: 'Enter', preventDefault: vi.fn() } as never);
    props.onKeyDown({ key: ' ', preventDefault: vi.fn() } as never);
    props.onKeyDown({ key: 'a', preventDefault: vi.fn() } as never);
    expect(onActivate).toHaveBeenCalledTimes(3);
  });
});
