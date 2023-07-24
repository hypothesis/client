import {
  CopyIcon,
  IconButton,
  Input,
  InputGroup,
  LockIcon,
  Spinner,
} from '@hypothesis/frontend-shared';
import { useCallback } from 'preact/hooks';

import { pageSharingLink } from '../helpers/annotation-sharing';
import { withServices } from '../service-context';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';
import { copyText } from '../util/copy-to-clipboard';
import ShareLinks from './ShareLinks';
import SidebarPanel from './SidebarPanel';

export type ShareAnnotationPanelProps = {
  // injected
  toastMessenger: ToastMessengerService;
};

type SharePanelContentProps = {
  loading: boolean;
  shareURI?: string | null;
  /** Callback for when "copy URL" button is clicked */
  onCopyShareLink: () => void;
  groupName?: string;
  groupType?: string;
};

/**
 * Render content for "share" panel or tab
 */
function SharePanelContent({
  groupName,
  groupType,
  loading,
  onCopyShareLink,
  shareURI,
}: SharePanelContentProps) {
  if (loading) {
    return (
      <div className="flex flex-row items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="text-color-text-light space-y-3">
      {shareURI ? (
        <>
          <div
            className="text-color-text font-medium"
            data-testid="sharing-intro"
          >
            {groupType === 'private' ? (
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
                onClick={onCopyShareLink}
                title="Copy share link"
                variant="dark"
              />
            </InputGroup>
          </div>
          <p data-testid="sharing-details">
            {groupType === 'private' ? (
              <span>
                Annotations in the private group <em>{groupName}</em> are only
                visible to group members.
              </span>
            ) : (
              <span>
                Anyone using this link may view the annotations in the group{' '}
                <em>{groupName}</em>.
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

/**
 * A panel for sharing the current group's annotations on the current document.
 *
 * Links within this component allow a user to share the set of annotations that
 * are on the current page (as defined by the main frame's URI) and contained
 * within the app's currently-focused group.
 */
function ShareAnnotationsPanel({ toastMessenger }: ShareAnnotationPanelProps) {
  const store = useSidebarStore();
  const mainFrame = store.mainFrame();
  const focusedGroup = store.focusedGroup();
  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Share Annotations in ${groupName}`;

  // To be able to concoct a sharing link, a focused group and frame need to
  // be available
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

  return (
    <SidebarPanel title={panelTitle} panelName="shareGroupAnnotations">
      <SharePanelContent
        groupName={focusedGroup?.name}
        groupType={focusedGroup?.type}
        loading={!sharingReady}
        onCopyShareLink={copyShareLink}
        shareURI={shareURI}
      />
    </SidebarPanel>
  );
}

export default withServices(ShareAnnotationsPanel, ['toastMessenger']);
