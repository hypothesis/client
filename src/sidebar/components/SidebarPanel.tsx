import { Panel } from '@hypothesis/frontend-shared/lib/next';
import type { IconComponent } from '@hypothesis/frontend-shared/lib/types';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import scrollIntoView from 'scroll-into-view';

import type { PanelName } from '../../types/sidebar';
import { useSidebarStore } from '../store';
import Slider from './Slider';

export type SidebarPanelProps = {
  children: ComponentChildren;
  /** An optional icon name for display next to the panel's title */
  icon?: IconComponent;
  /**
   * A string identifying this panel. Only one `panelName` may be active at any
   * time. Multiple panels with the same `panelName` would be "in sync", opening
   * and closing together.
   */
  panelName: PanelName;
  title: string;
  /** Optional callback to invoke when this panel's active status changes */
  onActiveChanged?: (active: boolean) => void;
};

/**
 * Base component for a sidebar panel. Only one sidebar panel
 * (as defined by the panel's `panelName`) is active (visible) at one time.
 */
export default function SidebarPanel({
  children,
  icon,
  panelName,
  title,
  onActiveChanged,
}: SidebarPanelProps) {
  const store = useSidebarStore();
  const panelIsActive = store.isSidebarPanelOpen(panelName);

  const panelElement = useRef<HTMLDivElement | null>(null);
  const panelWasActive = useRef(panelIsActive);

  // Scroll the panel into view if it has just been opened
  useEffect(() => {
    if (panelWasActive.current !== panelIsActive) {
      panelWasActive.current = panelIsActive;
      if (panelIsActive && panelElement.current) {
        scrollIntoView(panelElement.current);
      }
      if (typeof onActiveChanged === 'function') {
        onActiveChanged(panelIsActive);
      }
    }
  }, [panelIsActive, onActiveChanged]);

  const closePanel = useCallback(() => {
    store.toggleSidebarPanel(panelName, false);
  }, [store, panelName]);

  return (
    <Slider visible={panelIsActive}>
      <div ref={panelElement} className="mb-4">
        <Panel title={title} icon={icon} onClose={closePanel}>
          {children}
        </Panel>
      </div>
    </Slider>
  );
}
