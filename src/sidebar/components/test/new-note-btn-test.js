'use strict';

const { mount } = require('enzyme');
const { createElement } = require('preact');
const { act } = require('preact/test-utils');

const events = require('../../events');
const NewNoteButton = require('../new-note-btn');
const mockImportedComponents = require('./mock-imported-components');

describe('NewNoteButton', function() {
  let fakeStore;
  let fakeSettings;
  let fakeRootScope;

  function createComponent() {
    return mount(
      <NewNoteButton
        $rootScope={fakeRootScope}
        settings={fakeSettings}
        store={fakeStore}
      />
    );
  }

  beforeEach(function() {
    fakeRootScope = {
      $broadcast: sinon.stub(),
    };
    fakeSettings = {
      branding: {
        ctaBackgroundColor: '#00f',
      },
    };
    fakeStore = {
      createAnnotation: sinon.stub(),
      frames: sinon.stub().returns([
        { id: null, uri: 'www.example.org' },
        { id: '1', uri: 'www.example.org' },
      ]),
    };

    NewNoteButton.$imports.$mock(mockImportedComponents());
    NewNoteButton.$imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    NewNoteButton.$imports.$restore();
  });

  it("sets a backgroundColor equal to the setting's ctaBackgroundColor color", () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper.find('Button').prop('style').backgroundColor,
      fakeSettings.branding.ctaBackgroundColor
    );
  });

  it('should broadcast BEFORE_ANNOTATION_CREATED event when the new note button is clicked', () => {
    const wrapper = createComponent();
    act(() => {
      wrapper
        .find('Button')
        .props()
        .onClick();
    });
    const topLevelFrame = fakeStore.frames().find(f => !f.id);
    assert.calledWith(
      fakeRootScope.$broadcast,
      events.BEFORE_ANNOTATION_CREATED,
      {
        target: [],
        uri: topLevelFrame.uri,
      }
    );
  });
});
