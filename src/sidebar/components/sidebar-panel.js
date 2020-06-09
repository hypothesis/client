import { createElement } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import propTypes from 'prop-types';
import scrollIntoView from 'scroll-into-view';

import useStore from '../store/use-store';

import Button from './button';
import Slider from './slider';
import SvgIcon from '../../shared/components/svg-icon';

/**
 * Base component for a sidebar panel.
 *
 * This component provides a basic visual container for sidebar panels, as well
 * as providing a close button. Only one sidebar panel (as defined by the panel's
 * `panelName`) is active at one time.
 */
export default function SidebarPanel({
  children,
  icon = '',
  panelName,
  title,
  onActiveChanged,
}) {
  const panelIsActive = useStore(store => store.isSidebarPanelOpen(panelName));
  const togglePanelFn = useStore(store => store.toggleSidebarPanel);

  const panelElement = useRef();
  const panelWasActive = useRef(panelIsActive);

  // Scroll the panel into view if it has just been opened
  useEffect(() => {
    if (panelWasActive.current !== panelIsActive) {
      panelWasActive.current = panelIsActive;
      if (panelIsActive) {
        scrollIntoView(panelElement.current);
      }
      if (typeof onActiveChanged === 'function') {
        onActiveChanged(panelIsActive);
      }
    }
  }, [panelIsActive, onActiveChanged]);

  const closePanel = () => {
    togglePanelFn(panelName, false);
  };

  return (
    <Slider visible={panelIsActive}>
      <div className="sidebar-panel" ref={panelElement}>
        <div className="sidebar-panel__header">
          {icon && (
            <div className="sidebar-panel__header-icon">
              <SvgIcon name={icon} title={title} />
            </div>
          )}
          <h2 className="sidebar-panel__title u-stretch">{title}</h2>
          <div>
            <Button icon="cancel" buttonText="Close" onClick={closePanel} />
          </div>
        </div>
        <div className="sidebar-panel__content">{children}</div>
      </div>
    </Slider>
  );
}

SidebarPanel.propTypes = {
  children: propTypes.any,

  /**
   * An optional icon name for display next to the panel's title
   */
  icon: propTypes.string,

  /**
   * A string identifying this panel. Only one `panelName` may be active at
   * any time. Multiple panels with the same `panelName` would be "in sync",
   * opening and closing together.
   */
  panelName: propTypes.string.isRequired,

  /** The panel's title: rendered in its containing visual "frame" */
  title: propTypes.string.isRequired,

  /** Optional callback to invoke when this panel's active status changes */
  onActiveChanged: propTypes.func,
};
