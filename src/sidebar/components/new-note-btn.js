import { createElement } from 'preact';
import propTypes from 'prop-types';

import uiConstants from '../ui-constants';
import { useStoreProxy } from '../store/use-store';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

import Button from './button';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 */

/**
 * @typedef NewNoteButtonProps
 * @prop {Object} annotationsService - Injected service.
 * @prop {MergedConfig} settings - Injected service.
 */

function NewNoteButton({ annotationsService, settings }) {
  const store = useStoreProxy();
  const topLevelFrame = store.mainFrame();
  const isLoggedIn = store.isLoggedIn();

  const onNewNoteBtnClick = function () {
    if (!isLoggedIn) {
      store.openSidebarPanel(uiConstants.PANEL_LOGIN_PROMPT);
      return;
    }
    if (!topLevelFrame) {
      return;
    }
    const annot = {
      target: [],
      uri: topLevelFrame.uri,
    };
    annotationsService.create(annot);
  };

  return (
    <div className="u-layout-row--justify-right">
      <Button
        buttonText="New note"
        className="button--primary"
        icon="add"
        onClick={onNewNoteBtnClick}
        style={applyTheme(['ctaBackgroundColor'], settings)}
      />
    </div>
  );
}
NewNoteButton.propTypes = {
  annotationsService: propTypes.object.isRequired,
  settings: propTypes.object.isRequired,
};

NewNoteButton.injectedProps = ['annotationsService', 'settings'];

export default withServices(NewNoteButton);
