import { useReducedMotion } from 'motion/react';

export const TAP_SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 };
export const PAGE_ENTER_EASE = [0.16, 1, 0.3, 1] as const;

export function tapMotionProps(reduced: boolean, scale = 0.98) {
  if (reduced) return {};
  return { whileTap: { scale }, transition: TAP_SPRING };
}

export function pageEnterProps(reduced: boolean) {
  if (reduced) {
    return { initial: false as const, animate: { opacity: 1 }, transition: { duration: 0 } };
  }
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.22, ease: PAGE_ENTER_EASE }
  };
}

/** Spring press props for interactive primitives; empty when reduced motion is on. */
export function useTapMotion(scale = 0.98) {
  const reduced = useReducedMotion();
  return tapMotionProps(Boolean(reduced), scale);
}

export function usePageEnter() {
  const reduced = useReducedMotion();
  return pageEnterProps(Boolean(reduced));
}

/** Path only — query/hash changes must not remount dashboard pages (search, graph, etc.). */
export function pageTransitionKey(asPath: string): string {
  return asPath.replace(/[?#].*$/, '') || '/';
}
