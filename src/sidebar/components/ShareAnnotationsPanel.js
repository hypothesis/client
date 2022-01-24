import {
  IconButton,
  Spinner,
  Icon,
  TextInput,
  TextInputWithButton,
} from '@hypothesis/frontend-shared';

import { useStoreProxy } from '../store/use-store';
import { pageSharingLink } from '../helpers/annotation-sharing';
import { copyText } from '../util/copy-to-clipboard';
import { withServices } from '../service-context';
import { notNull } from '../util/typing';

import ShareLinks from './ShareLinks';
import SidebarPanel from './SidebarPanel';

/**
 * @typedef ShareAnnotationsPanelProps
 * @prop {import('../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/**
 * A panel for sharing the current group's annotations on the current document.
 *
 * Links within this component allow a user to share the set of annotations that
 * are on the current page (as defined by the main frame's URI) and contained
 * within the app's currently-focused group.
 *
 * @param {ShareAnnotationsPanelProps} props
 */
function ShareAnnotationsPanel({ toastMessenger }) {
  const store = useStoreProxy();
  const mainFrame = store.mainFrame();
  const focusedGroup = store.focusedGroup();
  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Share Annotations in ${groupName}`;

  // To be able to concoct a sharing link, a focused group and frame need to
  // be available
  const sharingReady = focusedGroup && mainFrame;

  const shareURI =
    sharingReady &&
    pageSharingLink(notNull(mainFrame).uri, notNull(focusedGroup).id);

  const copyShareLink = () => {
    try {
      copyText(/** @type {string} */ (shareURI));
      toastMessenger.success('Copied share link to clipboard');
    } catch (err) {
      toastMessenger.error('Unable to copy link');
    }
  };

  return (
    <SidebarPanel title={panelTitle} panelName="shareGroupAnnotations">
      {!sharingReady && (
        <div className="flex flex-row items-center justify-center">
          <Spinner />
        </div>
      )}
      {sharingReady && (
        <div className="text-color-text-light space-y-3">
          {shareURI ? (
            <>
              <div
                className="text-color-text font-medium"
                data-testid="sharing-intro"
              >
                {notNull(focusedGroup).type === 'private' ? (
                  <p>
                    Use this link to share these annotations with other group
                    members:
                  </p>
                ) : (
                  <p>Use this link to share these annotations with anyone:</p>
                )}
              </div>
              <div>
                <TextInputWithButton>
                  <TextInput
                    aria-label="Use this URL to share these annotations"
                    type="text"
                    value={shareURI}
                    readOnly
                  />
                  <IconButton
                    icon="copy"
                    onClick={copyShareLink}
                    title="Copy share link"
                    variant="dark"
                  />
                </TextInputWithButton>
              </div>
              <p data-testid="sharing-details">
                {notNull(focusedGroup).type === 'private' ? (
                  <span>
                    Annotations in the private group{' '}
                    <em>{notNull(focusedGroup).name}</em> are only visible to
                    group members.
                  </span>
                ) : (
                  <span>
                    Anyone using this link may view the annotations in the group{' '}
                    <em>{notNull(focusedGroup).name}</em>.
                  </span>
                )}{' '}
                <span>
                  Private (
                  <Icon name="lock" classes="inline -mt-0.5" /> <em>Only Me</em>
                  ) annotations are only visible to you.
                </span>
              </p>
              <ShareLinks shareURI={shareURI} />
            </>
          ) : (
            <p data-testid="no-sharing">
              These annotations cannot be shared because this document is not
              available on the web.
            </p>
          )}
        </div>
      )}
    </SidebarPanel>
  );
}

export default withServices(ShareAnnotationsPanel, ['toastMessenger']);
