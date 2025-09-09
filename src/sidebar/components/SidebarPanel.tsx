import { Slider } from '@hypothesis/frontend-shared';
import CloseableContext from '@hypothesis/frontend-shared/lib/components/CloseableContext';
import type { ComponentChildren, RefObject } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import scrollIntoView from 'scroll-into-view';

import type { PanelName } from '../../types/sidebar';
import { useSidebarStore } from '../store';

export type SidebarPanelProps = {
  children: ComponentChildren;

  /**
   * A string identifying this panel. Only one `panelName` may be active at any
   * time. Multiple panels with the same `panelName` would be "in sync", opening
   * and closing together.
   */
  panelName: PanelName;

  /** Optional callback to invoke when this panel's active status changes */
  onActiveChanged?: (active: boolean) => void;

  /** If provided, an element to focus on open */
  initialFocus?: RefObject<HTMLOrSVGElement | null>;
};

/**
 * Base component for a sidebar panel. Only one sidebar panel
 * (as defined by the panel's `panelName`) is active (visible) at one time.
 */
export default function SidebarPanel({
  children,
  panelName,
  onActiveChanged,
  initialFocus,
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
      onActiveChanged?.(panelIsActive);
    }
  }, [panelIsActive, onActiveChanged]);

  const onTransitionEnd = useCallback(
    (direction: 'in' | 'out') => {
      if (direction !== 'in') {
        return;
      }

      const focusEl = initialFocus?.current as HTMLElement & {
        disabled?: boolean;
      };

      if (focusEl && !focusEl.disabled) {
        focusEl.focus();
      }
    },
    [initialFocus],
  );

  const closePanel = useCallback(
    () => store.toggleSidebarPanel(panelName, false),
    [store, panelName],
  );

  return (
    <CloseableContext.Provider value={{ onClose: closePanel }}>
      <Slider
        direction={panelIsActive ? 'in' : 'out'}
        onTransitionEnd={onTransitionEnd}
      >
        {children}
      </Slider>
    </CloseableContext.Provider>
  );
}
