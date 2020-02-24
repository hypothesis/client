import { createElement } from 'preact';
import propTypes from 'prop-types';

import uiConstants from '../ui-constants';
import useStore from '../store/use-store';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

import Button from './button';

function NewNoteButton({ settings }) {
  const topLevelFrame = useStore(store => store.mainFrame());
  const isLoggedIn = useStore(store => store.isLoggedIn());

  const createAnnotation = useStore(store => store.createAnnotation);
  const openSidebarPanel = useStore(store => store.openSidebarPanel);

  const onNewNoteBtnClick = function() {
    if (!isLoggedIn) {
      openSidebarPanel(uiConstants.PANEL_LOGIN_PROMPT);
      return;
    }
    const annot = {
      target: [],
      uri: topLevelFrame.uri,
    };
    createAnnotation(annot);
  };

  return (
    <div className="new-note-button">
      <Button
        buttonText="New note"
        icon="add"
        onClick={onNewNoteBtnClick}
        style={applyTheme(['ctaBackgroundColor'], settings)}
        useCompactStyle
        usePrimaryStyle
      />
    </div>
  );
}
NewNoteButton.propTypes = {
  // Injected services.
  settings: propTypes.object.isRequired,
};

NewNoteButton.injectedProps = ['settings'];

export default withServices(NewNoteButton);
