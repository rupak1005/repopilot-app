import { useReducedMotion } from 'motion/react';

export const TAP_SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 };

/** Spring press props for interactive primitives; empty when reduced motion is on. */
export function useTapMotion(scale = 0.98) {
  const reduced = useReducedMotion();
  if (reduced) return {};
  return { whileTap: { scale }, transition: TAP_SPRING };
}
