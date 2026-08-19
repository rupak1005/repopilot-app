import Link from 'next/link';
import type { Icon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useTapMotion } from '../../lib/motion';

const MotionLink = motion.create(Link);

export type NavItemProps = {
  href: string;
  label: string;
  icon: Icon;
  active?: boolean;
  onClick?: () => void;
};

/** Phase 3 primitive — sidebar nav link with Motion spring press. */
export function NavItem({ href, label, icon: IconComponent, active = false, onClick }: NavItemProps) {
  const tap = useTapMotion();

  return (
    <MotionLink
      href={href}
      className={`ui-nav-item${active ? ' ui-nav-item--active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      {...tap}
    >
      <span className="ui-nav-item__icon" aria-hidden>
        <IconComponent size={18} weight={active ? 'regular' : 'light'} />
      </span>
      <span className="ui-nav-item__label">{label}</span>
    </MotionLink>
  );
}
