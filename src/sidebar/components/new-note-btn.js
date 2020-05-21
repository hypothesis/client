import { createElement } from 'preact';
import propTypes from 'prop-types';

import uiConstants from '../ui-constants';
import useStore from '../store/use-store';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

import Button from './button';

function NewNoteButton({ annotationsService, settings }) {
  const topLevelFrame = useStore(store => store.mainFrame());
  const isLoggedIn = useStore(store => store.isLoggedIn());

  const openSidebarPanel = useStore(store => store.openSidebarPanel);

  const onNewNoteBtnClick = function () {
    if (!isLoggedIn) {
      openSidebarPanel(uiConstants.PANEL_LOGIN_PROMPT);
      return;
    }
    const annot = {
      target: [],
      uri: topLevelFrame.uri,
    };
    annotationsService.create(annot);
  };

  return (
    <div className="new-note-button">
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
  // Injected services.
  annotationsService: propTypes.object.isRequired,
  settings: propTypes.object.isRequired,
};

NewNoteButton.injectedProps = ['annotationsService', 'settings'];

export default withServices(NewNoteButton);
