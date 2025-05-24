import { Card, Tab } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useState } from 'preact/hooks';

import { useSidebarStore } from '../../store';
import SidebarPanel from '../SidebarPanel';
import TabHeader from '../tabs/TabHeader';
import TabPanel from '../tabs/TabPanel';
import ExportAnnotations from './ExportAnnotations';
import ImportAnnotations from './ImportAnnotations';
// ShareAnnotations import removed

export type ShareDialogProps = {
  /** If true, the share tab will be rendered. Defaults to false */
  // This prop might become less relevant if the "Share" tab is always removed.
  // For now, its presence doesn't harm, but the tab itself will be gone.
  shareTab?: boolean;
};

/**
 * Panel with sharing options.
 * - If provided tabs include `export` or `import`, will show a tabbed interface
 * - Else, shows a single "Share annotations" interface
 */
export default function ShareDialog({ shareTab }: ShareDialogProps) {
  const store = useSidebarStore();
  const focusedGroup = store.focusedGroup();
  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Manage Annotations in ${groupName}`; // Adjusted title

  // Determine initial selected tab. Since "Share" is removed, "export" is the first.
  const initialTab = 'export';
  const [selectedTab, setSelectedTab] = useState<'export' | 'import'>( // 'share' type removed
    initialTab,
  );
  // isFirstTabSelected logic might need re-evaluation if 'export' is always first.
  // For now, if selectedTab is 'export', it's the first.
  const isFirstTabSelected = selectedTab === 'export';

  return (
    <SidebarPanel
      title={panelTitle}
      panelName="shareGroupAnnotations" // This panelName might be too specific now
      variant="custom"
    >
      <TabHeader closeTitle="Close panel">
        {/* Share Tab removed */}
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
      </TabHeader>
      <Card classes={classnames({ 'rounded-tl-none': isFirstTabSelected })}>
        {/* ShareAnnotations TabPanel removed */}
        <TabPanel
          id="export-panel"
          active={selectedTab === 'export'}
          aria-labelledby="export-panel-tab"
          title={`Export from ${groupName}`}
        >
          <ExportAnnotations />
        </TabPanel>
        <TabPanel
          id="import-panel"
          active={selectedTab === 'import'}
          aria-labelledby="import-panel-tab"
          title={`Import into ${groupName}`}
        >
          <ImportAnnotations />
        </TabPanel>
      </Card>
    </SidebarPanel>
  );
}
