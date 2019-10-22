'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useEffect, useRef } = require('preact/hooks');
const scrollIntoView = require('scroll-into-view');

const useStore = require('../store/use-store');

const Slider = require('./slider');
const SvgIcon = require('./svg-icon');

/**
 * Base component for a sidebar panel.
 *
 * This component provides a basic visual container for sidebar panels, as well
 * as providing a close button. Only one sidebar panel (as defined by the panel's
 * `panelName`) is active at one time.
 */
function SidebarPanel({ children, panelName, title, onActiveChanged }) {
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
          <div className="sidebar-panel__title u-stretch">{title}</div>
          <div>
            <button
              className="sidebar-panel__close-btn"
              onClick={closePanel}
              aria-label="close panel"
            >
              <SvgIcon
                name="cancel"
                className="sidebar-panel__close-btn-icon"
              />
              Close
            </button>
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
   * A string identifying this panel. Only one `panelName` may be active at
   * any time. Multiple panels with the same `panelName` would be "in sync",
   * opening and closing together.
   */
  panelName: propTypes.string.isRequired,

  /** The panel's title: rendered in its containing visual "frame" */
  title: propTypes.string.isRequired,

  onActiveChanged: propTypes.func,
};

module.exports = SidebarPanel;
