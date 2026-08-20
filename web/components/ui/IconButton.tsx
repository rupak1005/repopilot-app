import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { useTapMotion } from '../../lib/motion';

type IconButtonVariant = 'ghost' | 'subtle';
type IconButtonSize = 'sm' | 'md';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, type = 'button', ...rest },
  ref
) {
  const tap = useTapMotion();
  const classes = [
    'ui-icon-button',
    `ui-icon-button--${variant}`,
    `ui-icon-button--${size}`,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      ref={ref}
      type={type}
      className={classes}
      aria-label={label}
      {...tap}
      {...(rest as HTMLMotionProps<'button'>)}
    >
      {children}
    </motion.button>
  );
});
