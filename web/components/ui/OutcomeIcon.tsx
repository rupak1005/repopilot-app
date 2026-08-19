import {
  CheckCircle,
  Clock,
  Warning,
  XCircle
} from '@phosphor-icons/react';

type OutcomeIconProps = {
  outcome: string | null;
  size?: number;
};

export function OutcomeIcon({ outcome, size = 16 }: OutcomeIconProps) {
  switch (outcome) {
    case 'PASS':
      return <CheckCircle size={size} weight="fill" color="var(--status-success)" aria-hidden />;
    case 'FAIL':
      return <XCircle size={size} weight="fill" color="var(--status-danger)" aria-hidden />;
    case 'WARN':
      return <Warning size={size} weight="fill" color="var(--status-warn)" aria-hidden />;
    default:
      return <Clock size={size} weight="light" color="var(--text-muted)" aria-hidden />;
  }
}
