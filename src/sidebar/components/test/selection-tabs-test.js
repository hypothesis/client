'use strict';

const { mount } = require('enzyme');
const { createElement } = require('preact');

const uiConstants = require('../../ui-constants');
const SelectionTabs = require('../selection-tabs');

describe('SelectionTabs', function() {
  // mock services
  let fakeSession;
  let fakeSettings;

  SelectionTabs.$imports.$mock({
    '../store/use-store': callback =>
      callback({
        clearSelectedAnnotations: sinon.stub(),
        selectTab: sinon.stub(),
      }),
  });

  function createComponent(props) {
    const defaultProps = {
      isLoading: false,
      isWaitingToAnchorAnnotations: false,
      selectedTab: uiConstants.TAB_ANNOTATIONS,
      totalAnnotations: 123,
      totalNotes: 456,
      totalOrphans: 0,
      ...props,
    };
    return mount(
      <SelectionTabs
        session={fakeSession}
        settings={fakeSettings}
        {...defaultProps}
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
  });
  context('displays selection tabs, counts and a selection', function() {
    it('should display the tabs and counts of annotations and notes', function() {
      const wrapper = createComponent();
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
      const wrapper = createComponent();
      const aTags = wrapper.find('a');
      assert.isTrue(aTags.at(0).hasClass('is-selected'));
    });

    it('should display notes tab as selected', function() {
      const wrapper = createComponent({
        selectedTab: uiConstants.TAB_NOTES,
      });
      const tabs = wrapper.find('a');
      assert.isTrue(tabs.at(1).hasClass('is-selected'));
    });

    it('should display orphans tab as selected', function() {
      const wrapper = createComponent({
        selectedTab: uiConstants.TAB_ORPHANS,
      });
      const tabs = wrapper.find('a');
      assert.isTrue(tabs.at(2).hasClass('is-selected'));
    });

    it('should show the clean theme when settings does not contain the clean theme option', function() {
      fakeSettings.theme = 'clean';
      const wrapper = createComponent();
      assert.isTrue(wrapper.exists('.selection-tabs--theme-clean'));
    });

    it('should not show the clean theme when settings does not contain the clean theme option', function() {
      const wrapper = createComponent();
      assert.isFalse(wrapper.exists('.selection-tabs--theme-clean'));
    });

    /*
    // TODO: Issue #1206
    //
    it('should not display the new new note button when the annotations tab is active', function() {
      const wrapper = createComponent();
      assert.isFalse(wrapper.exists('.new-note-btn'));
    });

    it('should not display the new note button when the notes tab is active and the new note button is disabled', function() {
      const wrapper = createComponent({
        selectedTab: uiConstants.TAB_NOTES,
      });
      assert.isFalse(wrapper.exists('.new-note-btn'));
    });

    it('should display the new note button when the notes tab is active and the new note button is enabled', function() {
      const wrapper = createComponent({
        selectedTab: uiConstants.TAB_NOTES,
      });
      assert.isTrue(wrapper.exists('.new-note-btn'));
    });
    */

    it('should not display a message when its loading annotation count is 0', function() {
      const wrapper = createComponent({
        totalAnnotations: 0,
        isLoading: true,
      });
      assert.isFalse(wrapper.exists('.annotation-unavailable-message__label'));
    });

    it('should not display a message when its loading notes count is 0', function() {
      const wrapper = createComponent({
        selectedTab: uiConstants.TAB_NOTES,
        totalNotes: 0,
        isLoading: true,
      });
      assert.isFalse(wrapper.exists('.annotation-unavailable-message__label'));
    });

    it('should display the longer version of the no notes message when there are no notes', function() {
      const wrapper = createComponent({
        selectedTab: uiConstants.TAB_NOTES,
        totalNotes: 0,
      });
      assert.include(
        wrapper.find('.annotation-unavailable-message__label').text(),
        'There are no page notes in this group.'
      );
    });

    it('should display the prompt to create a note when there are no notes and enableExperimentalNewNoteButton is true', function() {
      fakeSettings.enableExperimentalNewNoteButton = true;
      const wrapper = createComponent({
        selectedTab: uiConstants.TAB_NOTES,
        totalNotes: 0,
      });
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
      const wrapper = createComponent({
        totalAnnotations: 0,
      });
      assert.include(
        wrapper.find('.annotation-unavailable-message__label').text(),
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
        const wrapper = createComponent({
          totalNotes: 0,
          selectedTab: uiConstants.TAB_NOTES,
        });

        const msg = wrapper.find('.annotation-unavailable-message__label');

        assert.include(msg.text(), 'There are no page notes in this group.');
        assert.notInclude(msg.text(), 'Create one by clicking the');
        assert.notInclude(
          msg.text(),
          'Create one by selecting some text and clicking the'
        );
      });

      it('should display the shorter version of the no annotations message when there are no annotations', function() {
        fakeSession.state.preferences.show_sidebar_tutorial = true;
        const wrapper = createComponent({
          totalAnnotations: 0,
        });

        const msg = wrapper.find('.annotation-unavailable-message__label');

        assert.include(msg.text(), 'There are no annotations in this group.');
        assert.notInclude(msg.text(), 'Create one by clicking the');
        assert.notInclude(
          msg.text(),
          'Create one by selecting some text and clicking the'
        );
      });
    });
  });
});
