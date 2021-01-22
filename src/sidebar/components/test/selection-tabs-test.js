import { mount } from 'enzyme';
import { createElement } from 'preact';

import uiConstants from '../../ui-constants';
import SelectionTabs from '../selection-tabs';
import { $imports } from '../selection-tabs';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('SelectionTabs', function () {
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
      clearSelection: sinon.stub(),
      selectTab: sinon.stub(),
      annotationCount: sinon.stub().returns(123),
      noteCount: sinon.stub().returns(456),
      orphanCount: sinon.stub().returns(0),
      isWaitingToAnchorAnnotations: sinon.stub().returns(false),
      selectedTab: sinon.stub().returns(uiConstants.TAB_ANNOTATIONS),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store/use-store': { useStoreProxy: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const unavailableMessage = wrapper =>
    wrapper.find('.selection-tabs__message').text();

  context('displays selection tabs and counts', function () {
    it('should display the tabs and counts of annotations and notes', function () {
      const wrapper = createComponent();
      const tabs = wrapper.find('button');
      assert.isTrue(tabs.at(0).contains('Annotations'));
      assert.equal(tabs.at(0).find('.selection-tabs__count').text(), 123);
      assert.isTrue(tabs.at(1).contains('Page Notes'));
      assert.equal(tabs.at(1).find('.selection-tabs__count').text(), 456);
    });

    it('should display annotations tab as selected', function () {
      const wrapper = createComponent();
      const tabs = wrapper.find('button');
      assert.isTrue(tabs.at(0).hasClass('is-selected'));
      assert.equal(tabs.at(0).prop('aria-selected'), 'true');
      assert.equal(tabs.at(1).prop('aria-selected'), 'false');
    });

    it('should display notes tab as selected', function () {
      fakeStore.selectedTab.returns(uiConstants.TAB_NOTES);
      const wrapper = createComponent({});
      const tabs = wrapper.find('button');
      assert.isTrue(tabs.at(1).hasClass('is-selected'));
      assert.equal(tabs.at(1).prop('aria-selected'), 'true');
      assert.equal(tabs.at(0).prop('aria-selected'), 'false');
    });

    it('should display orphans tab as selected if there is 1 or more orphans', function () {
      fakeStore.selectedTab.returns(uiConstants.TAB_ORPHANS);
      fakeStore.orphanCount.returns(1);
      const wrapper = createComponent({});
      const tabs = wrapper.find('button');
      assert.isTrue(tabs.at(2).hasClass('is-selected'));
      assert.equal(tabs.at(2).prop('aria-selected'), 'true');
      assert.equal(tabs.at(1).prop('aria-selected'), 'false');
      assert.equal(tabs.at(0).prop('aria-selected'), 'false');
    });

    it('should not display orphans tab if there are 0 orphans', function () {
      fakeStore.selectedTab.returns(uiConstants.TAB_ORPHANS);
      const wrapper = createComponent({});
      const tabs = wrapper.find('button');
      assert.equal(tabs.length, 2);
    });

    it('should render `title` and `aria-label` attributes for tab buttons, with counts', () => {
      fakeStore.orphanCount.returns(1);
      const wrapper = createComponent({});

      const tabs = wrapper.find('button');

      assert.equal(
        tabs.at(0).prop('aria-label'),
        'Annotations (123 available)'
      );
      assert.equal(tabs.at(0).prop('title'), 'Annotations (123 available)');
      assert.equal(tabs.at(1).prop('aria-label'), 'Page notes (456 available)');
      assert.equal(tabs.at(1).prop('title'), 'Page notes (456 available)');
      assert.equal(tabs.at(2).prop('aria-label'), 'Orphans (1 available)');
      assert.equal(tabs.at(2).prop('title'), 'Orphans (1 available)');
    });

    it('should not render count in `title` and `aria-label` for page notes tab if there are no page notes', () => {
      fakeStore.noteCount.returns(0);

      const wrapper = createComponent({});

      const tabs = wrapper.find('button');

      assert.equal(tabs.at(1).prop('aria-label'), 'Page notes');
      assert.equal(tabs.at(1).prop('title'), 'Page notes');
    });

    it('should not display the new-note-btn when the annotations tab is active', function () {
      const wrapper = createComponent();
      assert.equal(wrapper.find('NewNoteButton').length, 0);
    });

    it('should not display the new-note-btn when the notes tab is active and the new-note-btn is disabled', function () {
      fakeStore.selectedTab.returns(uiConstants.TAB_NOTES);
      const wrapper = createComponent({});
      assert.equal(wrapper.find('NewNoteButton').length, 0);
    });

    it('should display the new-note-btn when the notes tab is active and the new-note-btn is enabled', function () {
      fakeSettings.enableExperimentalNewNoteButton = true;
      fakeStore.selectedTab.returns(uiConstants.TAB_NOTES);
      const wrapper = createComponent({});
      assert.equal(wrapper.find('NewNoteButton').length, 1);
    });

    it('should not display a message when its loading annotation count is 0', function () {
      fakeStore.annotationCount.returns(0);
      const wrapper = createComponent({
        isLoading: true,
      });
      assert.isFalse(wrapper.exists('.annotation-unavailable-message__label'));
    });

    it('should not display a message when its loading notes count is 0', function () {
      fakeStore.selectedTab.returns(uiConstants.TAB_NOTES);
      fakeStore.noteCount.returns(0);
      const wrapper = createComponent({
        isLoading: true,
      });
      assert.isFalse(wrapper.exists('.selection-tabs__message'));
    });

    it('should not display the longer version of the no annotations message when there are no annotations and isWaitingToAnchorAnnotations is true', function () {
      fakeStore.annotationCount.returns(0);
      fakeStore.isWaitingToAnchorAnnotations.returns(true);
      const wrapper = createComponent({
        isLoading: false,
      });
      assert.isFalse(wrapper.exists('.selection-tabs__message'));
    });

    it('should display the longer version of the no notes message when there are no notes', function () {
      fakeStore.selectedTab.returns(uiConstants.TAB_NOTES);
      fakeStore.noteCount.returns(0);
      const wrapper = createComponent({});
      assert.include(
        unavailableMessage(wrapper),
        'There are no page notes in this group.'
      );
    });

    it('should display the longer version of the no annotations message when there are no annotations', function () {
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

  const findButton = (wrapper, label) =>
    wrapper.findWhere(
      el => el.type() === 'button' && el.text().includes(label)
    );

  [
    { label: 'Annotations', tab: uiConstants.TAB_ANNOTATIONS },
    { label: 'Page Notes', tab: uiConstants.TAB_NOTES },
    { label: 'Orphans', tab: uiConstants.TAB_ORPHANS },
  ].forEach(({ label, tab }) => {
    it(`should change the selected tab when "${label}" tab is clicked`, () => {
      // Pre-select a different tab than the one we are about to click.
      fakeStore.selectedTab.returns('other-tab');

      // Make the "Orphans" tab appear.
      fakeStore.orphanCount.returns(1);
      const wrapper = createComponent({});

      findButton(wrapper, label).simulate('click');

      assert.calledOnce(fakeStore.clearSelection);
      assert.calledWith(fakeStore.selectTab, tab);
    });
  });

  it('does not change the selected tab if it is already selected', () => {
    fakeStore.selectedTab.returns(uiConstants.TAB_NOTES);
    const wrapper = createComponent({});

    findButton(wrapper, 'Page Notes').simulate('click');

    assert.notCalled(fakeStore.clearSelection);
    assert.notCalled(fakeStore.selectTab);
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
