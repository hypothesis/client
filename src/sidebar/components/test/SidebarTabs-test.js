import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import SidebarTabs, { $imports } from '../SidebarTabs';

describe('SidebarTabs', () => {
  // mock services
  let fakeAnnotationsService;
  let fakeSettings;
  let fakeFrameSync;
  let fakeStore;
  let fakeUseRootThread;

  function createComponent(props = {}) {
    return mount(
      <SidebarTabs
        annotationsService={fakeAnnotationsService}
        settings={fakeSettings}
        frameSync={fakeFrameSync}
        isLoading={false}
        {...props}
      />,
    );
  }

  function stubTabCounts(tabCounts = {}) {
    fakeUseRootThread.returns({
      rootThread: {
        children: [],
      },
      tabCounts: {
        annotation: 123,
        note: 456,
        orphan: 0,
        ...tabCounts,
      },
    });
  }

  beforeEach(() => {
    fakeAnnotationsService = {
      createPageNote: sinon.stub(),
    };
    fakeSettings = {
      enableExperimentalNewNoteButton: false,
    };
    fakeFrameSync = {
      getDocumentInfo: sinon.stub().resolves({ metadata: {} }),
    };
    fakeStore = {
      selectTab: sinon.stub(),
      isWaitingToAnchorAnnotations: sinon.stub().returns(false),
      selectedTab: sinon.stub().returns('annotation'),
    };
    fakeUseRootThread = sinon.stub();
    stubTabCounts();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      './hooks/use-root-thread': { useRootThread: fakeUseRootThread },
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should display the tabs and counts of annotations and notes', () => {
    const wrapper = createComponent();
    const annotationTab = wrapper.find('Tab[label="Annotations"]');
    const noteTab = wrapper.find('Tab[label="Page notes"]');

    assert.include(annotationTab.text(), 'Annotations');
    assert.include(annotationTab.text(), '123');

    assert.include(noteTab.text(), 'Page Notes');
    assert.include(noteTab.text(), '456');
  });

  describe('Annotations tab', () => {
    it('should display annotations tab as selected when it is active', () => {
      const wrapper = createComponent();
      const annotationTab = wrapper.find('Tab[label="Annotations"]');
      const noteTab = wrapper.find('Tab[label="Page notes"]');

      assert.isTrue(annotationTab.find('LinkButton').props().pressed);
      assert.isFalse(noteTab.find('LinkButton').props().pressed);
    });

    it('should not display the add-page-note button when the annotations tab is active', () => {
      fakeSettings.enableExperimentalNewNoteButton = true;
      const wrapper = createComponent();
      assert.equal(
        wrapper.find('Button[data-testid="new-note-button"]').length,
        0,
      );
    });
  });

  describe('Notes tab', () => {
    it('should display notes tab as selected when it is active', () => {
      fakeStore.selectedTab.returns('note');
      const wrapper = createComponent();

      const annotationTabButton = wrapper
        .find('Tab[label="Annotations"]')
        .find('LinkButton');
      const noteTabButton = wrapper
        .find('Tab[label="Page notes"]')
        .find('LinkButton');

      assert.isTrue(noteTabButton.prop('pressed'));
      assert.isFalse(annotationTabButton.prop('pressed'));
    });

    describe('Add Page Note button', () => {
      it('should not display the add-page-note button if the associated setting is not enabled', () => {
        fakeSettings.enableExperimentalNewNoteButton = false;
        fakeStore.selectedTab.returns('note');

        const wrapper = createComponent();

        assert.isFalse(
          wrapper.find('LabeledButton[data-testid="new-note-button"]').exists(),
        );
      });

      it('should display the add-page-note button when the associated setting is enabled', () => {
        fakeSettings.enableExperimentalNewNoteButton = true;
        fakeStore.selectedTab.returns('note');

        const wrapper = createComponent();

        assert.isTrue(
          wrapper.find('Button[data-testid="new-note-button"]').exists(),
        );
      });

      it('should apply background-color styling from settings', () => {
        fakeSettings = {
          branding: {
            ctaBackgroundColor: '#00f',
          },
          enableExperimentalNewNoteButton: true,
        };
        fakeStore.selectedTab.returns('note');

        const wrapper = createComponent();

        const button = wrapper.find('Button[data-testid="new-note-button"]');
        assert.deepEqual(button.prop('style'), { backgroundColor: '#00f' });
      });

      it('should add a new page note on click', async () => {
        fakeSettings.enableExperimentalNewNoteButton = true;
        fakeStore.selectedTab.returns('note');

        const wrapper = createComponent();
        await wrapper
          .find('Button[data-testid="new-note-button"]')
          .props()
          .onClick();

        assert.calledOnce(fakeFrameSync.getDocumentInfo);
        assert.calledOnce(fakeAnnotationsService.createPageNote);
      });
    });
  });

  describe('unanchored tab', () => {
    it('should display unanchored tab if there is 1 or more orphans', () => {
      stubTabCounts({ orphan: 1 });
      const wrapper = createComponent();

      const unanchoredTab = wrapper.find('Tab[label="Unanchored"]');
      assert.isTrue(unanchoredTab.exists());
    });

    it('should display unanchored tab as selected when it is active', () => {
      fakeStore.selectedTab.returns('orphan');
      stubTabCounts({ orphan: 1 });

      const wrapper = createComponent();

      const unanchoredTab = wrapper.find('Tab[label="Unanchored"]');
      assert.isTrue(unanchoredTab.find('LinkButton').prop('pressed'));
    });

    it('should not display unanchored tab if there are 0 orphans', () => {
      const wrapper = createComponent();
      assert.isFalse(wrapper.exists('Tab[label="Unanchored"]'));
    });
  });

  describe('tab display and counts', () => {
    it('should not render count if there are no page notes', () => {
      stubTabCounts({ note: 0 });
      const wrapper = createComponent();

      const noteTab = wrapper.find('Tab[label="Page notes"]');

      assert.equal(noteTab.text(), 'Page Notes');
    });

    it('should not display a message when its loading annotation count is 0', () => {
      stubTabCounts({ annotation: 0 });
      const wrapper = createComponent({ isLoading: true });
      assert.isFalse(
        wrapper.exists('[data-testid="annotations-unavailable-message"]'),
      );
    });

    it('should not display a message when its loading notes count is 0', () => {
      stubTabCounts({ note: 0 });
      fakeStore.selectedTab.returns('note');
      const wrapper = createComponent({ isLoading: true });
      assert.isFalse(
        wrapper.exists('[data-testid="notes-unavailable-message"]'),
      );
    });

    it('should not display the longer version of the no annotations message when there are no annotations and isWaitingToAnchorAnnotations is true', () => {
      stubTabCounts({ annotation: 0 });
      fakeStore.isWaitingToAnchorAnnotations.returns(true);
      const wrapper = createComponent({ isLoading: false });
      assert.isFalse(
        wrapper.exists('[data-testid="annotations-unavailable-message"]'),
      );
    });

    it('should display the longer version of the no notes message when there are no notes', () => {
      stubTabCounts({ note: 0 });
      fakeStore.selectedTab.returns('note');
      const wrapper = createComponent();

      assert.include(
        wrapper.find('Card[data-testid="notes-unavailable-message"]').text(),
        'There are no page notes in this group',
      );
    });

    it('should display the longer version of the no annotations message when there are no annotations', () => {
      stubTabCounts({ annotation: 0 });
      const wrapper = createComponent();
      assert.include(
        wrapper
          .find('Card[data-testid="annotations-unavailable-message"]')
          .text(),
        'There are no annotations in this group',
      );
    });
  });

  const findButton = (wrapper, label) =>
    wrapper.findWhere(
      el => el.type() === 'button' && el.text().includes(label),
    );

  [
    { label: 'Annotations', tab: 'annotation' },
    { label: 'Page Notes', tab: 'note' },
    { label: 'Unanchored', tab: 'orphan' },
  ].forEach(({ label, tab }) => {
    it(`should change the selected tab when "${label}" tab is clicked`, () => {
      // Pre-select a different tab than the one we are about to click.
      fakeStore.selectedTab.returns('other-tab');
      // Make the "Unanchored" tab appear.
      stubTabCounts({ orphan: 1 });

      const wrapper = createComponent();

      findButton(wrapper, label).simulate('click');

      assert.calledWith(fakeStore.selectTab, tab);
    });
  });

  it('does not change the selected tab if it is already selected', () => {
    fakeStore.selectedTab.returns('note');
    const wrapper = createComponent();

    findButton(wrapper, 'Page Notes').simulate('click');

    assert.notCalled(fakeStore.selectTab);
  });

  [
    {
      tabCounts: {
        annotation: 2,
        note: 0,
        orphan: 0,
      },
      message: '2 annotations',
    },
    {
      tabCounts: {
        annotation: 0,
        note: 3,
        orphan: 0,
      },
      message: '3 notes',
    },
    {
      tabCounts: {
        annotation: 0,
        note: 0,
        orphan: 4,
      },
      message: '4 unanchored',
    },
    {
      tabCounts: {
        annotation: 2,
        note: 3,
        orphan: 4,
      },
      message: '2 annotations, 3 notes, 4 unanchored',
    },
    {
      tabCounts: {
        annotation: 1,
        note: 1,
        orphan: 1,
      },
      message: '1 annotation, 1 note, 1 unanchored',
    },
  ].forEach(({ tabCounts, message }) => {
    it('reports annotation count to screen readers', () => {
      stubTabCounts(tabCounts);
      const wrapper = createComponent();
      const status = wrapper.find('[role="status"]');
      assert.equal(status.text(), message);
    });
  });

  describe('comments mode', () => {
    it.each([
      {
        commentsMode: false,
        shouldShowAnnosTab: true,
        expectedNoteText: 'Page notes',
        expectedButtonText: 'New note',
        expectedFallbackMessage: 'There are no page notes in this group.',
      },
      {
        commentsMode: true,
        shouldShowAnnosTab: false,
        expectedNoteText: 'Comments',
        expectedButtonText: 'Add comment',
        expectedFallbackMessage: 'There are no comments in this group.',
      },
    ])(
      'shows different contents if comments mode is enabled',
      ({
        commentsMode,
        shouldShowAnnosTab,
        expectedNoteText,
        expectedButtonText,
        expectedFallbackMessage,
      }) => {
        fakeStore.selectedTab.returns('note');
        stubTabCounts({ note: 0 });

        fakeSettings.enableExperimentalNewNoteButton = true;
        fakeSettings.commentsMode = commentsMode;

        const wrapper = createComponent();

        assert.equal(
          wrapper.exists('Tab[name="annotation"]'),
          shouldShowAnnosTab,
        );
        assert.equal(
          wrapper.find('Tab[name="note"]').prop('label'),
          expectedNoteText,
        );
        assert.equal(
          wrapper.find('Button[data-testid="new-note-button"]').text(),
          expectedButtonText,
        );
        assert.equal(
          wrapper.find('Card[data-testid="notes-unavailable-message"]').text(),
          expectedFallbackMessage,
        );
      },
    );
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => {
        stubTabCounts({
          annotation: 1,
          note: 2,
          orphan: 3,
        });
        return createComponent();
      },
    }),
  );
});
