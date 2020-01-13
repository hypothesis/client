import { createElement } from 'preact';
import propTypes from 'prop-types';

import events from '../events';
import useStore from '../store/use-store';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

import Button from './button';

function NewNoteButton({ $rootScope, settings }) {
  const store = useStore(store => ({
    frames: store.frames(),
  }));

  const onNewNoteBtnClick = function() {
    const topLevelFrame = store.frames.find(f => !f.id);
    const annot = {
      target: [],
      uri: topLevelFrame.uri,
    };
    $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);
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
  $rootScope: propTypes.object.isRequired,
  settings: propTypes.object.isRequired,
};

NewNoteButton.injectedProps = ['$rootScope', 'settings'];

export default withServices(NewNoteButton);
