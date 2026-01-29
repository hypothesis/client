import classnames from 'classnames';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef } from 'preact/hooks';

type DialogProps = {
  closed: boolean;
  children: ComponentChildren;
  onClose: () => void;
  className?: string;
  'data-testid'?: string;
  'aria-label'?: string;
};

function NativeDialog({
  closed,
  onClose,
  children,
  className,
  'data-testid': testId,
  'aria-label': label,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (closed) {
      dialogRef.current?.close();
    } else {
      dialogRef.current?.showModal();
    }
  }, [closed]);

  useEffect(() => {
    const dialogElement = dialogRef.current;

    dialogElement?.addEventListener('cancel', onClose);
    return () => {
      dialogElement?.removeEventListener('cancel', onClose);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={classnames(
        'relative m-5 w-full h-full backdrop:bg-black/50',
        className,
      )}
      data-testid={testId}
      aria-label={label}
    >
      {children}
    </dialog>
  );
}

/**
 * Temporary fallback used in browsers not supporting `dialog` element.
 * It can be removed once all browsers we support can use it.
 */
function FallbackDialog({ closed, children, className, ...rest }: DialogProps) {
  return (
    <div
      {...rest}
      className={classnames(
        'fixed z-max top-0 left-0 right-0 bottom-0 p-3 bg-black/50',
        { hidden: closed },
      )}
    >
      <div className={classnames('relative w-full h-full', className)}>
        {children}
      </div>
    </div>
  );
}

/** Checks if the browser supports native modal dialogs */
function isModalDialogSupported(document: Document) {
  const dialog = document.createElement('dialog');
  return typeof dialog.showModal === 'function';
}

export type ModalDialogProps = DialogProps & {
  document_?: Document;
};

export default function ModalDialog({
  /* istanbul ignore next - test seam */
  document_ = document,
  ...rest
}: ModalDialogProps) {
  const Dialog = useMemo(
    () => (isModalDialogSupported(document_) ? NativeDialog : FallbackDialog),
    [document_],
  );

  return <Dialog {...rest} />;
}
