import { IconButton, CancelIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { ComponentChildren } from 'preact';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import { addConfigFragment } from '../../shared/config-fragment';
import { createAppConfig } from '../config/app';
import type { EventBus, Emitter } from '../util/emitter';

/**
 * Configuration used to launch the notebook application.
 *
 * This includes the URL for the iframe and configuration to pass to the
 * application on launch.
 */
export type NotebookConfig = {
  notebookAppUrl: string;
} & Record<string, unknown>;

type NotebookIframeProps = {
  config: NotebookConfig;
  groupId: string;
};
/**
 * Create the iframe that will load the notebook application.
 */
function NotebookIframe({ config, groupId }: NotebookIframeProps) {
  const notebookAppSrc = addConfigFragment(config.notebookAppUrl, {
    ...createAppConfig(config.notebookAppUrl, config),

    // Explicitly set the "focused" group
    group: groupId,
  });

  return (
    <iframe
      title={'Hypothesis annotation notebook'}
      className="h-full w-full border-0"
      allow="fullscreen; clipboard-write"
      src={notebookAppSrc}
    />
  );
}

/** Checks if the browser supports native modal dialogs */
function isModalDialogSupported(document: Document) {
  const dialog = document.createElement('dialog');
  return typeof dialog.showModal === 'function';
}

export type NotebookModalProps = {
  eventBus: EventBus;
  config: NotebookConfig;

  /** Test seam */
  document_?: Document;
};

type DialogProps = {
  isHidden: boolean;
  children: ComponentChildren;
  onClose: () => void;
};

const NativeDialog = ({ isHidden, children, onClose }: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (isHidden) {
      dialogRef.current?.close();
    } else {
      dialogRef.current?.showModal();
    }
  }, [isHidden]);

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
      className="relative w-full h-full backdrop:bg-black/50"
      data-testid="notebook-outer"
    >
      {children}
    </dialog>
  );
};

/**
 * Temporary fallback used in browsers not supporting `dialog` element.
 * It can be removed once all browsers we support can use it.
 */
const FallbackDialog = ({ isHidden, children }: DialogProps) => {
  return (
    <div
      className={classnames(
        'fixed z-max top-0 left-0 right-0 bottom-0 p-3 bg-black/50',
        { hidden: isHidden },
      )}
      data-testid="notebook-outer"
    >
      <div className="relative w-full h-full" data-testid="notebook-inner">
        {children}
      </div>
    </div>
  );
};

/**
 * Create a modal component that hosts (1) the notebook iframe and (2) a button to close the modal.
 */
export default function NotebookModal({
  eventBus,
  config,
  /* istanbul ignore next - test seam */
  document_ = document,
}: NotebookModalProps) {
  // Temporary solution: while there is no mechanism to sync new annotations in
  // the notebook, we force re-rendering of the iframe on every 'openNotebook'
  // event, so that the new annotations are displayed.
  // https://github.com/hypothesis/client/issues/3182
  const [iframeKey, setIframeKey] = useState(0);
  const [isHidden, setIsHidden] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const originalDocumentOverflowStyle = useRef('');
  const emitterRef = useRef<Emitter | null>(null);

  const Dialog = useMemo(
    () => (isModalDialogSupported(document_) ? NativeDialog : FallbackDialog),
    [document_],
  );

  // Stores the original overflow CSS property of document.body and reset it
  // when the component is destroyed
  useEffect(() => {
    originalDocumentOverflowStyle.current = document.body.style.overflow;

    return () => {
      document.body.style.overflow = originalDocumentOverflowStyle.current;
    };
  }, []);

  // The overflow CSS property is set to hidden to prevent scrolling of the host page,
  // while the notebook modal is open. It is restored when the modal is closed.
  useEffect(() => {
    if (isHidden) {
      document.body.style.overflow = originalDocumentOverflowStyle.current;
    } else {
      document.body.style.overflow = 'hidden';
    }
  }, [isHidden]);

  useEffect(() => {
    const emitter = eventBus.createEmitter();
    emitter.subscribe('openNotebook', (groupId: string) => {
      setIsHidden(false);
      setIframeKey(iframeKey => iframeKey + 1);
      setGroupId(groupId);
    });
    emitterRef.current = emitter;

    return () => {
      emitter.destroy();
    };
  }, [eventBus]);

  const onClose = useCallback(() => {
    setIsHidden(true);
    emitterRef.current?.publish('closeNotebook');
  }, []);

  if (groupId === null) {
    return null;
  }

  return (
    <Dialog isHidden={isHidden} onClose={onClose}>
      <div className="absolute right-0 m-3">
        <IconButton
          title="Close the Notebook"
          onClick={onClose}
          variant="dark"
          classes={classnames(
            // Remove the dark variant's background color to avoid
            // interfering with modal overlays. Re-activate the dark variant's
            // background color on hover.
            // See https://github.com/hypothesis/client/issues/3676
            '!bg-transparent enabled:hover:!bg-grey-3',
          )}
          data-testid="close-button"
        >
          <CancelIcon className="w-4 h-4" />
        </IconButton>
      </div>
      <NotebookIframe key={iframeKey} config={config} groupId={groupId} />
    </Dialog>
  );
}
