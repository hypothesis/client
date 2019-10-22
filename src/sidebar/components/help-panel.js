'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

const { useMemo, useState } = require('preact/hooks');
const useStore = require('../store/use-store');
const uiConstants = require('../ui-constants');
const getVersionData = require('../util/version-data');
const { withServices } = require('../util/service-context');

const SidebarPanel = require('./sidebar-panel');
const SvgIcon = require('./svg-icon');
const Tutorial = require('./tutorial');
const VersionInfo = require('./version-info');

const SUBPANELS = {
  TUTORIAL: 'tutorial',
  VERSIONINFO: 'versionInfo',
};

/**
 * A help sidebar panel with two sub-panels: tutorial and version info.
 */
function HelpPanel({ auth, session }) {
  const mainFrame = useStore(store => store.mainFrame());
  const isAutoDisplayed = useStore(store => store.isTutorialAutoDisplayed());

  // The "Tutorial" (getting started) subpanel is default
  const [activeSubPanel, setActiveSubPanel] = useState(SUBPANELS.TUTORIAL);

  const versionData = useMemo(() => getVersionData(auth, mainFrame), [
    auth,
    mainFrame,
  ]);

  const supportTicketURL = (() => {
    let versionString = '';
    for (let prop in versionData) {
      if (Object.prototype.hasOwnProperty.call(versionData, prop)) {
        versionString += `${prop}: ${versionData[prop]}\r\n`;
      }
    }
    const encodedVersionString = encodeURIComponent(versionString);
    return `https://web.hypothes.is/get-help/?sys_info=${encodedVersionString}`;
  })();

  const subPanelTitle =
    activeSubPanel === SUBPANELS.TUTORIAL
      ? 'Getting started'
      : 'About this version';

  const openSubPanel = (e, panelName) => {
    e.preventDefault();
    setActiveSubPanel(panelName);
  };

  // Dismiss the tutorial when closed (update user preference so it doesn't
  // auto-display on subsequent app launch)
  const onActiveChanged = active => {
    if (!active && isAutoDisplayed) {
      session.dismissSidebarTutorial();
    }
  };

  return (
    <SidebarPanel
      title="Need some help?"
      panelName={uiConstants.PANEL_HELP}
      onActiveChanged={onActiveChanged}
    >
      <h3 className="help-panel__sub-panel-title">{subPanelTitle}</h3>
      <div className="help-panel__content">
        {activeSubPanel === SUBPANELS.TUTORIAL && <Tutorial />}
        {activeSubPanel === SUBPANELS.VERSIONINFO && (
          <VersionInfo versionData={versionData} />
        )}
        <div className="help-panel__footer">
          {activeSubPanel === SUBPANELS.VERSIONINFO && (
            <a
              href="#"
              className="help-panel__sub-panel-link help-panel__sub-panel-link--left"
              onClick={e => openSubPanel(e, 'tutorial')}
            >
              <SvgIcon name="arrow-left" className="help-panel__icon" />
              <div>Getting started</div>
            </a>
          )}
          {activeSubPanel === SUBPANELS.TUTORIAL && (
            <a
              href="#"
              className="help-panel__sub-panel-link help-panel__sub-panel-link--right"
              onClick={e => openSubPanel(e, 'versionInfo')}
            >
              <div>About this version</div>
              <SvgIcon name="arrow-right" className="help-panel__icon" />
            </a>
          )}
        </div>
      </div>
      <div className="help-panel-tabs">
        <div className="help-panel-tabs__tab">
          <a
            href={supportTicketURL}
            className="help-panel-tabs__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            New support ticket{' '}
            <SvgIcon
              name="external"
              className="help-panel-tabs__icon"
              inline={true}
            />
          </a>
        </div>
        <div className="help-panel-tabs__tab">
          <a
            href="https://web.hypothes.is/help/"
            className="help-panel-tabs__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Help topics{' '}
            <SvgIcon
              name="external"
              className="help-panel-tabs__icon"
              inline={true}
            />
          </a>
        </div>
      </div>
    </SidebarPanel>
  );
}

HelpPanel.propTypes = {
  /* Object with auth and user information */
  auth: propTypes.object.isRequired,
  session: propTypes.object.isRequired,
};

HelpPanel.injectedProps = ['session'];
module.exports = withServices(HelpPanel);
