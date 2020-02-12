import { mount } from 'enzyme';
import { createElement } from 'preact';

import uiConstants from '../../ui-constants';
import SelectionTabs from '../selection-tabs';
import { $imports } from '../selection-tabs';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('SelectionTabs', function() {
  // mock services
  let fakeSettings;
  let fakeStore;

  // default props
  const defaultProps = {
    isLoading: false,
  };

  function createComponent(props) {
    return mount(
      <SelectionTabs settings={fakeSettings} {...defaultProps} {...props} />
    );
  }

  beforeEach(() => {
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
      getState: sinon.stub().returns({
        selection: {
          selectedTab: uiConstants.TAB_ANNOTATIONS,
        },
      }),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': callback => callback(fakeStore),
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const unavailableMessage = wrapper =>
    wrapper.find('.selection-tabs__message').text();

  context('displays selection tabs and counts', function() {
    it('should display the tabs and counts of annotations and notes', function() {
      const wrapper = createComponent();
      const tabs = wrapper.find('button');
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
      const tabs = wrapper.find('button');
      assert.isTrue(tabs.at(0).hasClass('is-selected'));
    });

    it('should display notes tab as selected', function() {
      fakeStore.getState.returns({
        selection: { selectedTab: uiConstants.TAB_NOTES },
      });
      const wrapper = createComponent({});
      const tabs = wrapper.find('button');
      assert.isTrue(tabs.at(1).hasClass('is-selected'));
    });

    it('should display orphans tab as selected if there is 1 or more orphans', function() {
      fakeStore.getState.returns({
        selection: { selectedTab: uiConstants.TAB_ORPHANS },
      });
      fakeStore.orphanCount.returns(1);
      const wrapper = createComponent({});
      const tabs = wrapper.find('button');
      assert.isTrue(tabs.at(2).hasClass('is-selected'));
    });

    it('should not display orphans tab if there are 0 orphans', function() {
      fakeStore.getState.returns({
        selection: { selectedTab: uiConstants.TAB_ORPHANS },
      });
      const wrapper = createComponent({});
      const tabs = wrapper.find('button');
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
      assert.equal(wrapper.find('NewNoteButton').length, 0);
    });

    it('should not display the new-note-btn when the notes tab is active and the new-note-btn is disabled', function() {
      fakeStore.getState.returns({
        selection: { selectedTab: uiConstants.TAB_NOTES },
      });
      const wrapper = createComponent({});
      assert.equal(wrapper.find('NewNoteButton').length, 0);
    });

    it('should display the new-note-btn when the notes tab is active and the new-note-btn is enabled', function() {
      fakeSettings.enableExperimentalNewNoteButton = true;
      fakeStore.getState.returns({
        selection: { selectedTab: uiConstants.TAB_NOTES },
      });
      const wrapper = createComponent({});
      assert.equal(wrapper.find('NewNoteButton').length, 1);
    });

    it('should not display a message when its loading annotation count is 0', function() {
      fakeStore.annotationCount.returns(0);
      const wrapper = createComponent({
        isLoading: true,
      });
      assert.isFalse(wrapper.exists('.annotation-unavailable-message__label'));
    });

    it('should not display a message when its loading notes count is 0', function() {
      fakeStore.getState.returns({
        selection: { selectedTab: uiConstants.TAB_NOTES },
      });
      fakeStore.noteCount.returns(0);
      const wrapper = createComponent({
        isLoading: true,
      });
      assert.isFalse(wrapper.exists('.selection-tabs__message'));
    });

    it('should not display the longer version of the no annotations message when there are no annotations and isWaitingToAnchorAnnotations is true', function() {
      fakeStore.annotationCount.returns(0);
      fakeStore.isWaitingToAnchorAnnotations.returns(true);
      const wrapper = createComponent({
        isLoading: false,
      });
      assert.isFalse(wrapper.exists('.selection-tabs__message'));
    });

    it('should display the longer version of the no notes message when there are no notes', function() {
      fakeStore.getState.returns({
        selection: { selectedTab: uiConstants.TAB_NOTES },
      });
      fakeStore.noteCount.returns(0);
      const wrapper = createComponent({});
      assert.include(
        unavailableMessage(wrapper),
        'There are no page notes in this group.'
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
        unavailableMessage(wrapper),
        'Create one by selecting some text and clicking the'
      );
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => {
        fakeStore.annotationCount.returns(1);
        fakeStore.noteCount.returns(2);
        fakeStore.orphanCount.returns(3);
        return createComponent({});
      },
    })
  );
});
