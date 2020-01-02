'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const events = require('../events');
const useStore = require('../store/use-store');
const { applyTheme } = require('../util/theme');
const { withServices } = require('../util/service-context');

const Button = require('./button');

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

module.exports = withServices(NewNoteButton);
