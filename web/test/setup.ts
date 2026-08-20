import React from 'react';
import { vi } from 'vitest';

vi.mock('next/link', () => ({
  default: React.forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
  >(function MockLink({ href, children, ...props }, ref) {
    return React.createElement('a', { href, ref, ...props }, children);
  })
}));

const PHOSPHOR_ICONS = [
  'Bell',
  'BookOpen',
  'Question',
  'GitBranch',
  'CaretDown',
  'MagnifyingGlass',
  'PaperPlaneRight',
  'Lightning',
  'FileCode',
  'LockSimple',
  'Code',
  'SquaresFour',
  'GitPullRequest',
  'Flame',
  'Gear',
  'Graph',
  'Crosshair',
  'ClockCounterClockwise',
  'Plugs',
  'Terminal'
] as const;

vi.mock('@phosphor-icons/react', () => {
  const icons: Record<string, React.FC<{ size?: number; weight?: string }>> = {};
  for (const name of PHOSPHOR_ICONS) {
    icons[name] = function StubIcon() {
      return React.createElement('span', { 'data-icon': name });
    };
  }
  return icons;
});

function stripMotionProps<T extends Record<string, unknown>>(props: T) {
  const {
    whileTap: _whileTap,
    transition: _transition,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    ...rest
  } = props;
  return rest;
}

function motionTag(tag: string) {
  return function MotionStub({
    children,
    ...props
  }: { children?: React.ReactNode } & Record<string, unknown>) {
    return React.createElement(tag, stripMotionProps(props), children);
  };
}

function motionWrap<P extends { children?: React.ReactNode }>(Comp: React.ComponentType<P>) {
  return function MotionWrapped(props: P & Record<string, unknown>) {
    return React.createElement(Comp, stripMotionProps(props) as P);
  };
}

vi.mock('motion/react', () => ({
  motion: {
    create: motionWrap,
    button: motionTag('button'),
    a: motionTag('a'),
    div: motionTag('div')
  },
  useReducedMotion: vi.fn(() => false),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  MotionConfig: ({ children }: { children: React.ReactNode }) => children
}));
