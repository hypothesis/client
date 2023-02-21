import { IconButton, CancelIcon } from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';
import { useEffect, useRef, useState } from 'preact/hooks';

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

    // Explicity set the "focused" group
    group: groupId,
  });

  return (
    <iframe
      title={'Hypothesis annotation notebook'}
      className="h-full w-full border-0"
      // Enable media in annotations to be shown fullscreen.
      // TODO: Use `allow="fullscreen" once `allow` attribute available for
      // iframe elements in all supported browsers
      // See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-allow
      // eslint-disable-next-line react/no-unknown-property
      allowFullScreen
      src={notebookAppSrc}
    />
  );
}

export type NotebookModalProps = {
  eventBus: EventBus;
  config: NotebookConfig;
};

/**
 * Create a modal component that hosts (1) the notebook iframe and (2) a button to close the modal.
 */
export default function NotebookModal({
  eventBus,
  config,
}: NotebookModalProps) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const originalDocumentOverflowStyle = useRef('');
  const emitterRef = useRef<Emitter | null>(null);

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
    if (groupId === null) {
      document.body.style.overflow = originalDocumentOverflowStyle.current;
    } else {
      document.body.style.overflow = 'hidden';
    }
  }, [groupId]);

  useEffect(() => {
    const emitter = eventBus.createEmitter();
    emitter.subscribe('openNotebook', (groupId: string) => {
      setGroupId(groupId);
    });
    emitterRef.current = emitter;

    return () => {
      emitter.destroy();
    };
  }, [eventBus]);

  const onClose = () => {
    setGroupId(null);
    emitterRef.current?.publish('closeNotebook');
  };

  // Temporary solution: while there is no mechanism to sync new annotations in
  // the notebook, we force re-rendering of the iframe on every 'openNotebook'
  // event, so that the new annotations are displayed.
  // https://github.com/hypothesis/client/issues/3182
  if (groupId === null) {
    return null;
  }

  return (
    <div
      className="fixed z-max top-0 left-0 right-0 bottom-0 p-3 bg-black/50"
      data-testid="notebook-outer"
    >
      <div className="relative w-full h-full" data-testid="notebook-inner">
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
              '!bg-transparent enabled:hover:!bg-grey-3'
            )}
          >
            <CancelIcon className="w-4 h-4" />
          </IconButton>
        </div>
        <NotebookIframe config={config} groupId={groupId} />
      </div>
    </div>
  );
}
