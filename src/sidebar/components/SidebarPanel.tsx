import { CloseableContext, Slider } from '@hypothesis/frontend-shared';
import type { ComponentChildren, RefObject } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
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

  /** A label to be set on the panel's `aria-label` */
  label: string;
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
  label,
  onActiveChanged,
  initialFocus,
}: SidebarPanelProps) {
  const store = useSidebarStore();
  const panelIsActive = store.isSidebarPanelOpen(panelName);
  const [showPanelContent, setShowPanelContent] = useState(false);
  // The panel content should be mounted when it is active or being closed, but
  // once it's fully closed we can unmount it.
  // We use this because `panelIsActive` changes immediately, but the panel is
  // closed with a transition, changing `showPanelContent` once finished.
  const mountContent = panelIsActive || showPanelContent;

  const panelElement = useRef<HTMLDivElement | null>(null);
  const panelWasActive = useRef(panelIsActive);
  const sectionRef = useRef<HTMLElement | null>(null);
  const originalFocusRef = useRef<HTMLElement | null>(null);

  // Scroll the panel into view if it has just been opened.
  // We do this via a panelIsActive-based effect, rather than via `onTransitionEnd`,
  // so that scroll happens right when the transition starts.
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
      setShowPanelContent(direction === 'in');

      if (direction === 'out') {
        // When the panel is closed, move focus back to originally focused element
        originalFocusRef.current?.focus();
        return;
      }

      const initialFocusEl = initialFocus?.current as HTMLElement & {
        disabled?: boolean;
      };
      const focusEl =
        initialFocusEl && !initialFocusEl.disabled
          ? initialFocusEl
          : sectionRef.current;

      // When the panel is opened, track element that was focused, then focus
      // the initial element or the panel itself
      originalFocusRef.current = document.activeElement as HTMLElement | null;
      focusEl?.focus();
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
        elementRef={panelElement}
      >
        {mountContent && (
          <section
            aria-label={label}
            className="mb-4 focus-visible-ring rounded-lg"
            ref={sectionRef}
            tabIndex={-1}
          >
            {children}
          </section>
        )}
      </Slider>
    </CloseableContext.Provider>
  );
}
