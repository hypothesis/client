'use strict';

const { shallow, mount } = require('enzyme');
const { createElement } = require('preact');

const NewNoteBtn = require('../new-note-btn');
const uiConstants = require('../../ui-constants');
const SelectionTabs = require('../selection-tabs');

describe('SelectionTabs', function() {
  // mock services
  let fakeSession;
  let fakeSettings;
  let fakeStore;

  // default props
  const defaultProps = {
    isLoading: false,
  };

  SelectionTabs.$imports.$mock({
    '../store/use-store': callback => callback(fakeStore),
  });

  function createComponent(props) {
    return shallow(
      <SelectionTabs
        session={fakeSession}
        settings={fakeSettings}
        {...defaultProps}
        {...props}
      />
    ).dive();
  }

  // required for <Tab> rendering
  function createDeepComponent(props) {
    return mount(
      <SelectionTabs
        session={fakeSession}
        settings={fakeSettings}
        {...defaultProps}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeSession = {
      state: {
        preferences: {
          show_sidebar_tutorial: false,
        },
      },
    };
    fakeSettings = {
      enableExperimentalNewNoteButton: false,
    };
    fakeStore = {
      clearSelectedAnnotations: sinon.stub(),
      selectTab: sinon.stub(),
      annotationCount: sinon.stub().returns(123),
      noteCount: sinon.stub().returns(456),
      orphanCount: sinon.stub().returns(0),
      isWaitingToAnchorAnnotations: sinon.stub().returns(false),
      getState: sinon
        .stub()
        .returns({ selectedTab: uiConstants.TAB_ANNOTATIONS }),
    };
  });

  const unavailableMessage = wrapper =>
    wrapper.find('.annotation-unavailable-message__label').text();

  context('displays selection tabs and counts', function() {
    it('should display the tabs and counts of annotations and notes', function() {
      const wrapper = createDeepComponent();
      const tabs = wrapper.find('a');
      assert.isTrue(tabs.at(0).contains('Annotations'));
      assert.equal(
        tabs
          .at(0)
          .find('.selection-tabs__count')
          .text(),
        123
      );
      assert.isTrue(tabs.at(1).contains('Page Notes'));
      assert.equal(
        tabs
          .at(1)
          .find('.selection-tabs__count')
          .text(),
        456
      );
    });

    it('should display annotations tab as selected', function() {
      const wrapper = createDeepComponent();
      const aTags = wrapper.find('a');
      assert.isTrue(aTags.at(0).hasClass('is-selected'));
    });

    it('should display notes tab as selected', function() {
      fakeStore.getState.returns({ selectedTab: uiConstants.TAB_NOTES });
      const wrapper = createDeepComponent({});
      const tabs = wrapper.find('a');
      assert.isTrue(tabs.at(1).hasClass('is-selected'));
    });

    it('should display orphans tab as selected if there is 1 or more orphans', function() {
      fakeStore.getState.returns({ selectedTab: uiConstants.TAB_ORPHANS });
      fakeStore.orphanCount.returns(1);
      const wrapper = createDeepComponent({});
      const tabs = wrapper.find('a');
      assert.isTrue(tabs.at(2).hasClass('is-selected'));
    });

    it('should not display orphans tab if there are 0 orphans', function() {
      fakeStore.getState.returns({ selectedTab: uiConstants.TAB_ORPHANS });
      const wrapper = createDeepComponent({});
      const tabs = wrapper.find('a');
      assert.equal(tabs.length, 2);
    });

    it('should show the clean theme when settings contains the clean theme option', function() {
      fakeSettings.theme = 'clean';
      const wrapper = createComponent();
      assert.isTrue(wrapper.exists('.selection-tabs--theme-clean'));
    });

    it('should not show the clean theme when settings does not contain the clean theme option', function() {
      const wrapper = createComponent();
      assert.isFalse(wrapper.exists('.selection-tabs--theme-clean'));
    });

    it('should not display the new-note-btn when the annotations tab is active', function() {
      const wrapper = createComponent();
      assert.equal(wrapper.find(NewNoteBtn).length, 0);
    });

    it('should not display the new-note-btn when the notes tab is active and the new-note-btn is disabled', function() {
      fakeStore.getState.returns({ selectedTab: uiConstants.TAB_NOTES });
      const wrapper = createComponent({});
      assert.equal(wrapper.find(NewNoteBtn).length, 0);
    });

    it('should display the new-note-btn when the notes tab is active and the new-note-btn is enabled', function() {
      fakeSettings.enableExperimentalNewNoteButton = true;
      fakeStore.getState.returns({ selectedTab: uiConstants.TAB_NOTES });
      const wrapper = createComponent({});
      assert.equal(wrapper.find(NewNoteBtn).length, 1);
    });

    it('should not display a message when its loading annotation count is 0', function() {
      fakeStore.annotationCount.returns(0);
      const wrapper = createComponent({
        isLoading: true,
      });
      assert.isFalse(wrapper.exists('.annotation-unavailable-message__label'));
    });

    it('should not display a message when its loading notes count is 0', function() {
      fakeStore.getState.returns({ selectedTab: uiConstants.TAB_NOTES });
      fakeStore.noteCount.returns(0);
      const wrapper = createComponent({
        isLoading: true,
      });
      assert.isFalse(wrapper.exists('.annotation-unavailable-message__label'));
    });

    it('should not display the longer version of the no annotations message when there are no annotations and isWaitingToAnchorAnnotations is true', function() {
      fakeStore.annotationCount.returns(0);
      fakeStore.isWaitingToAnchorAnnotations.returns(true);
      const wrapper = createComponent({
        isLoading: false,
      });
      assert.isFalse(wrapper.exists('.annotation-unavailable-message__label'));
    });

    it('should display the longer version of the no notes message when there are no notes', function() {
      fakeStore.getState.returns({ selectedTab: uiConstants.TAB_NOTES });
      fakeStore.noteCount.returns(0);
      const wrapper = createComponent({});
      assert.include(
        unavailableMessage(wrapper),
        'There are no page notes in this group.'
      );
    });

    it('should display the prompt to create a note when there are no notes and enableExperimentalNewNoteButton is true', function() {
      fakeSettings.enableExperimentalNewNoteButton = true;
      fakeStore.getState.returns({ selectedTab: uiConstants.TAB_NOTES });
      fakeStore.noteCount.returns(0);
      const wrapper = createComponent({});
      assert.include(
        wrapper.find('.annotation-unavailable-message__tutorial').text(),
        'Create one by clicking the'
      );
      assert.isTrue(
        wrapper
          .find('.annotation-unavailable-message__tutorial i')
          .hasClass('h-icon-note')
      );
    });

    it('should display the longer version of the no annotations message when there are no annotations', function() {
      fakeStore.annotationCount.returns(0);
      const wrapper = createComponent({});
      assert.include(
        unavailableMessage(wrapper),
        'There are no annotations in this group.'
      );
      assert.include(
        wrapper.find('.annotation-unavailable-message__tutorial').text(),
        'Create one by selecting some text and clicking the'
      );
      assert.isTrue(
        wrapper
          .find('.annotation-unavailable-message__tutorial i')
          .hasClass('h-icon-annotate')
      );
    });

    context('when the sidebar tutorial is displayed', function() {
      it('should display the shorter version of the no notes message when there are no notes', function() {
        fakeSession.state.preferences.show_sidebar_tutorial = true;
        fakeStore.getState.returns({ selectedTab: uiConstants.TAB_NOTES });
        fakeStore.noteCount.returns(0);
        const wrapper = createComponent({});

        const msg = unavailableMessage(wrapper);

        assert.include(msg, 'There are no page notes in this group.');
        assert.notInclude(msg, 'Create one by clicking the');
        assert.notInclude(
          msg,
          'Create one by selecting some text and clicking the'
        );
      });

      it('should display the shorter version of the no annotations message when there are no annotations', function() {
        fakeSession.state.preferences.show_sidebar_tutorial = true;
        fakeStore.annotationCount.returns(0);
        const wrapper = createComponent({});

        const msg = unavailableMessage(wrapper);

        assert.include(msg, 'There are no annotations in this group.');
        assert.notInclude(msg, 'Create one by clicking the');
        assert.notInclude(
          msg,
          'Create one by selecting some text and clicking the'
        );
      });
    });
  });
});
