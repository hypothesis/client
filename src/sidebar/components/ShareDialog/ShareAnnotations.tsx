import {
  CopyIcon,
  Input,
  InputGroup,
  IconButton,
  LockIcon,
} from '@hypothesis/frontend-shared';
import { useCallback } from 'preact/hooks';

import { pageSharingLink } from '../../helpers/annotation-sharing';
import { withServices } from '../../service-context';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import { copyText } from '../../util/copy-to-clipboard';
import ShareLinks from '../ShareLinks';
import LoadingSpinner from './LoadingSpinner';

export type ShareAnnotationsProps = {
  // injected
  toastMessenger: ToastMessengerService;
};

/**
 * Render UI for sharing annotations (by URL) within the currently-focused group
 */
function ShareAnnotations({ toastMessenger }: ShareAnnotationsProps) {
  const store = useSidebarStore();
  const mainFrame = store.mainFrame();
  const focusedGroup = store.focusedGroup();
  const sharingReady = focusedGroup && mainFrame;

  const shareURI =
    sharingReady && pageSharingLink(mainFrame.uri, focusedGroup.id);

  const copyShareLink = useCallback(() => {
    try {
      if (shareURI) {
        copyText(shareURI);
        toastMessenger.success('Copied share link to clipboard');
      }
    } catch (err) {
      toastMessenger.error('Unable to copy link');
    }
  }, [shareURI, toastMessenger]);

  if (!sharingReady) {
    return <LoadingSpinner />;
  }

  return (
    <div className="text-color-text-light space-y-3">
      {shareURI ? (
        <>
          <div
            className="text-color-text font-medium"
            data-testid="sharing-intro"
          >
            {focusedGroup.type === 'private' ? (
              <p>
                Use this link to share these annotations with other group
                members:
              </p>
            ) : (
              <p>Use this link to share these annotations with anyone:</p>
            )}
          </div>
          <div>
            <InputGroup>
              <Input
                aria-label="Use this URL to share these annotations"
                type="text"
                value={shareURI}
                readOnly
              />
              <IconButton
                icon={CopyIcon}
                onClick={copyShareLink}
                title="Copy share link"
                variant="dark"
              />
            </InputGroup>
          </div>
          <p data-testid="sharing-details">
            {focusedGroup.type === 'private' ? (
              <span>
                Annotations in the private group <em>{focusedGroup.name}</em>{' '}
                are only visible to group members.
              </span>
            ) : (
              <span>
                Anyone using this link may view the annotations in the group{' '}
                <em>{focusedGroup.name}</em>.
              </span>
            )}{' '}
            <span>
              Private (
              <LockIcon className="inline w-em h-em ml-0.5 -mt-0.5" />{' '}
              <em>Only Me</em>) annotations are only visible to you.
            </span>
          </p>
          <div className="text-[24px]">
            <ShareLinks shareURI={shareURI} />
          </div>
        </>
      ) : (
        <p data-testid="no-sharing">
          These annotations cannot be shared because this document is not
          available on the web.
        </p>
      )}
    </div>
  );
}

export default withServices(ShareAnnotations, ['toastMessenger']);
