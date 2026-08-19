import { describe, expect, it } from 'vitest';
import { pageEnterProps, tapMotionProps, TAP_SPRING } from './motion';

describe('tapMotionProps', () => {
  it('returns spring scale when motion is allowed', () => {
    expect(tapMotionProps(false)).toEqual({
      whileTap: { scale: 0.98 },
      transition: TAP_SPRING
    });
  });

  it('uses custom scale', () => {
    expect(tapMotionProps(false, 0.99).whileTap).toEqual({ scale: 0.99 });
  });

  it('returns empty object when reduced motion is on', () => {
    expect(tapMotionProps(true)).toEqual({});
  });
});

describe('pageEnterProps', () => {
  it('returns fade/slide when motion is allowed', () => {
    const props = pageEnterProps(false);
    expect(props.initial).toEqual({ opacity: 0, y: 6 });
    expect(props.animate).toEqual({ opacity: 1, y: 0 });
    expect(props.exit).toEqual({ opacity: 0 });
  });

  it('disables enter animation when reduced motion is on', () => {
    const props = pageEnterProps(true);
    expect(props.initial).toBe(false);
    expect(props.transition).toEqual({ duration: 0 });
  });
});
