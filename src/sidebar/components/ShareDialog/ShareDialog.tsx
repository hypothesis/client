import {
  Button,
  Card,
  CardActions,
  CopyIcon,
  IconButton,
  Input,
  InputGroup,
  LockIcon,
  Tab,
} from '@hypothesis/frontend-shared';
import { useCallback, useState } from 'preact/hooks';

import { pageSharingLink } from '../../helpers/annotation-sharing';
import { withServices } from '../../service-context';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import { copyText } from '../../util/copy-to-clipboard';
import ShareLinks from '../ShareLinks';
import SidebarPanel from '../SidebarPanel';
import LoadingSpinner from './LoadingSpinner';
import TabHeader from './TabHeader';
import TabPanel from './TabPanel';

type SharePanelContentProps = {
  loading: boolean;
  shareURI?: string | null;
  /** Callback for when "copy URL" button is clicked */
  onCopyShareLink: () => void;
  groupName?: string;
  groupType?: string;
};

/**
 * Render content for "share" panel or tab.
 */
function SharePanelContent({
  groupName,
  groupType,
  loading,
  onCopyShareLink,
  shareURI,
}: SharePanelContentProps) {
  if (loading) {
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

type ExportPanelContentProps = {
  loading: boolean;
  annotationCount: number;
};

/**
 * Render content for "export" tab panel
 */
function ExportPanelContent({
  loading,
  annotationCount,
}: ExportPanelContentProps) {
  if (loading) {
    return <LoadingSpinner />;
  }

  // TODO: Handle 0 annotations
  return (
    <>
      <p>
        Export <strong>{annotationCount} annotations</strong> in a file named:
      </p>
      <Input id="export-filename" value="filename-tbd-export.json" />
      <CardActions>
        <Button variant="primary" disabled>
          Export
        </Button>
      </CardActions>
    </>
  );
}

export type ShareDialogProps = {
  // injected
  toastMessenger: ToastMessengerService;
};

/**
 * A panel for sharing the current group's annotations on the current document.
 *
 * Links within this component allow a user to share the set of annotations that
 * are on the current page (as defined by the main frame's URI) and contained
 * within the app's currently-focused group.
 */
function ShareDialog({ toastMessenger }: ShareDialogProps) {
  const store = useSidebarStore();
  const mainFrame = store.mainFrame();
  const focusedGroup = store.focusedGroup();
  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Share Annotations in ${groupName}`;
  const allAnnotations = store.allAnnotations();

  const tabbedDialog = store.isFeatureEnabled('export_annotations');
  const [selectedTab, setSelectedTab] = useState<'share' | 'export'>('share');

  // To be able to concoct a sharing link, a focused group and frame need to
  // be available
  const sharingReady = focusedGroup && mainFrame;
  // Show a loading spinner in the export tab if annotations are loading
  const exportReady = focusedGroup && !store.isLoading();

  const shareURI =
    sharingReady && pageSharingLink(mainFrame.uri, focusedGroup.id);

  // TODO: Move into Share-panel-content component once extracted
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
    <SidebarPanel
      title={panelTitle}
      panelName="shareGroupAnnotations"
      variant={tabbedDialog ? 'custom' : 'panel'}
    >
      {tabbedDialog && (
        <>
          <TabHeader>
            <Tab
              id="share-panel-tab"
              aria-controls="share-panel"
              variant="tab"
              selected={selectedTab === 'share'}
              onClick={() => setSelectedTab('share')}
              textContent={'Share'}
            >
              Share
            </Tab>
            <Tab
              id="export-panel-tab"
              aria-controls="export-panel"
              variant="tab"
              selected={selectedTab === 'export'}
              onClick={() => setSelectedTab('export')}
              textContent="Export"
            >
              Export
            </Tab>
          </TabHeader>
          <Card>
            <TabPanel
              id="share-panel"
              active={selectedTab === 'share'}
              aria-labelledby="share-panel-tab"
              title={panelTitle}
            >
              <SharePanelContent
                groupName={focusedGroup?.name}
                groupType={focusedGroup?.type}
                loading={!sharingReady}
                onCopyShareLink={copyShareLink}
                shareURI={shareURI}
              />
            </TabPanel>
            <TabPanel
              id="export-panel"
              active={selectedTab === 'export'}
              aria-labelledby="export-panel-tab"
              title={`Export from ${focusedGroup?.name ?? '...'}`}
            >
              <ExportPanelContent
                annotationCount={allAnnotations.length}
                loading={!exportReady}
              />
            </TabPanel>
          </Card>
        </>
      )}
      {!tabbedDialog && (
        <SharePanelContent
          groupName={focusedGroup?.name}
          groupType={focusedGroup?.type}
          loading={!sharingReady}
          onCopyShareLink={copyShareLink}
          shareURI={shareURI}
        />
      )}
    </SidebarPanel>
  );
}

export default withServices(ShareDialog, ['toastMessenger']);
