import { IconButton } from '@hypothesis/frontend-shared';
import { useEffect, useRef, useState } from 'preact/hooks';
import classnames from 'classnames';

import { createSidebarConfig } from '../config/sidebar';

/**
 * @typedef NotebookIframeProps
 * @prop {Record<string, any>} config
 * @prop {string} groupId
 */

/**
 * Create the iframe that will load the notebook application.
 *
 * @param {NotebookIframeProps} props
 */
function NotebookIframe({ config, groupId }) {
  const notebookConfig = createSidebarConfig(config);
  // Explicity set the "focused" group
  notebookConfig.group = groupId;
  const configParam = encodeURIComponent(JSON.stringify(notebookConfig));
  const notebookAppSrc = `${config.notebookAppUrl}#config=${configParam}`;

  return (
    <iframe
      title={'Hypothesis annotation notebook'}
      className="NotebookIframe"
      // Enable media in annotations to be shown fullscreen
      allowFullScreen
      src={notebookAppSrc}
    />
  );
}

/**
 * @typedef NotebookModalProps
 * @prop {Record<string, any>} config
 * @prop {string|null} groupId
 * @prop {boolean} open
 * @prop {() => void} onClose
 */

/**
 * Create a modal component that hosts (1) the notebook iframe and (2) a button to close the modal.
 *
 * @param {NotebookModalProps} props
 */
export default function NotebookModal({ config, groupId, open, onClose }) {
  // Temporary solution: while there is no mechanism to sync new annotations in
  // the notebook, we force re-rendering of the iframe on every 'openNotebook'
  // event, so that the new annotations are displayed.
  // https://github.com/hypothesis/client/issues/3182
  const [iframeKey, setIframeKey] = useState(0);
  const originalDocumentOverflowStyle = useRef('');

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
    if (!open) {
      document.body.style.overflow = originalDocumentOverflowStyle.current;
    } else {
      document.body.style.overflow = 'hidden';
    }
  }, [open]);

  // Force the iframe to be re-created whenever the notebook is re-opened so
  // that it displays the latest annotations.
  useEffect(() => {
    setIframeKey(key => key + 1);
  }, [open]);

  if (groupId === null) {
    return null;
  }

  return (
    <div className={classnames('NotebookModal__outer', { 'is-hidden': !open })}>
      <div className="NotebookModal__inner">
        <div className="NotebookModal__close-button-container">
          <IconButton
            icon="cancel"
            title="Close the Notebook"
            onClick={onClose}
            variant="dark"
          />
        </div>
        <NotebookIframe key={iframeKey} config={config} groupId={groupId} />
      </div>
    </div>
  );
}
