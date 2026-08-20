import { type MouseEvent, type ReactNode, useEffect, useRef } from 'react';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

/** Phase 16 — native `<dialog>` modal with neo panel styling. */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onCancel(event: Event) {
      event.preventDefault();
      onClose();
    }
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [onClose]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={ref}
      className="ui-dialog"
      aria-labelledby="ui-dialog-title"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="ui-dialog__panel" onClick={(event) => event.stopPropagation()}>
        <h2 className="ui-dialog__title" id="ui-dialog-title">
          {title}
        </h2>
        {description ? <p className="ui-dialog__desc">{description}</p> : null}
        {children ? <div className="ui-dialog__body">{children}</div> : null}
        {footer ? <div className="ui-dialog__footer">{footer}</div> : null}
      </div>
    </dialog>
  );
}
