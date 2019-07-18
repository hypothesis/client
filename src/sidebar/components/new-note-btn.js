'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const events = require('../events');
const useStore = require('../store/use-store');
const { applyTheme } = require('../util/theme');
const { withServices } = require('../util/service-context');

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
    <button
      style={applyTheme(['ctaBackgroundColor'], settings)}
      className="new-note__create"
      onClick={onNewNoteBtnClick}
    >
      + New note
    </button>
  );
}
NewNoteButton.propTypes = {
  // Injected services.
  $rootScope: propTypes.object.isRequired,
  settings: propTypes.object.isRequired,
};

NewNoteButton.injectedProps = ['$rootScope', 'settings'];

module.exports = withServices(NewNoteButton);
