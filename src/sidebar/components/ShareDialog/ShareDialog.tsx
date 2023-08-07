import { Card, Tab } from '@hypothesis/frontend-shared';
import { useState } from 'preact/hooks';

import { useSidebarStore } from '../../store';
import SidebarPanel from '../SidebarPanel';
import ExportAnnotations from './ExportAnnotations';
import ImportAnnotations from './ImportAnnotations';
import ShareAnnotations from './ShareAnnotations';
import TabHeader from './TabHeader';
import TabPanel from './TabPanel';

/**
 * Panel with sharing options.
 * - If export feature flag is enabled, will show a tabbed interface with
 *   share and export tabs
 * - Else, shows a single "Share annotations" interface
 */
export default function ShareDialog() {
  const store = useSidebarStore();
  const focusedGroup = store.focusedGroup();
  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Share Annotations in ${groupName}`;

  const showExportTab = store.isFeatureEnabled('export_annotations');
  const showImportTab = store.isFeatureEnabled('import_annotations');
  const tabbedDialog = showExportTab || showImportTab;
  const [selectedTab, setSelectedTab] = useState<'share' | 'export' | 'import'>(
    'share',
  );

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
            {showExportTab && (
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
            )}
            {showImportTab && (
              <Tab
                id="import-panel-tab"
                aria-controls="import-panel"
                variant="tab"
                selected={selectedTab === 'import'}
                onClick={() => setSelectedTab('import')}
                textContent="Import"
              >
                Import
              </Tab>
            )}
          </TabHeader>
          <Card>
            <TabPanel
              id="share-panel"
              active={selectedTab === 'share'}
              aria-labelledby="share-panel-tab"
              title={panelTitle}
            >
              <ShareAnnotations />
            </TabPanel>
            <TabPanel
              id="export-panel"
              active={selectedTab === 'export'}
              aria-labelledby="export-panel-tab"
              title={`Export from ${focusedGroup?.name ?? '...'}`}
            >
              <ExportAnnotations />
            </TabPanel>
            <TabPanel
              id="import-panel"
              active={selectedTab === 'import'}
              aria-labelledby="import-panel-tab"
              title={`Import into ${focusedGroup?.name ?? '...'}`}
            >
              <ImportAnnotations />
            </TabPanel>
          </Card>
        </>
      )}
      {!tabbedDialog && <ShareAnnotations />}
    </SidebarPanel>
  );
}
