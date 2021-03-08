import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';
import { applyTheme } from '../helpers/theme';

import Button from './Button';

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
      store.openSidebarPanel('loginPrompt');
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
        className="Button--primary"
        icon="add"
        onClick={onNewNoteBtnClick}
        style={applyTheme(['ctaBackgroundColor'], settings)}
      />
    </div>
  );
}

NewNoteButton.injectedProps = ['annotationsService', 'settings'];

export default withServices(NewNoteButton);
