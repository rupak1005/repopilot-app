import { CircleNotch } from '@phosphor-icons/react';

type InlineSpinnerProps = {
  label: string;
  className?: string;
};

export function InlineSpinner({ label, className }: InlineSpinnerProps) {
  const rootClass = ['ui-inline-spinner', className].filter(Boolean).join(' ');
  return (
    <div className={rootClass} role="status" aria-live="polite">
      <CircleNotch size={20} weight="bold" className="ui-inline-spinner__icon" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
