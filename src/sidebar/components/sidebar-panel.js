'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useEffect, useRef } = require('preact/hooks');
const scrollIntoView = require('scroll-into-view');

const useStore = require('../store/use-store');

const Slider = require('./slider');
const SvgIcon = require('./svg-icon');

function SidebarPanel({ children, panelName, title }) {
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
    }
  }, [panelIsActive]);

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
  panelName: propTypes.string.isRequired,
  title: propTypes.string.isRequired,
};

module.exports = SidebarPanel;
