import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import SelectionTabs, { $imports } from '../SelectionTabs';

describe('SelectionTabs', () => {
  // mock services
  let fakeAnnotationsService;
  let fakeSettings;
  let fakeStore;

  const defaultProps = {
    isLoading: false,
    tabCounts: {
      annotation: 123,
      note: 456,
      orphan: 0,
    },
  };

  function createComponent(props) {
    return mount(
      <SelectionTabs
        annotationsService={fakeAnnotationsService}
        settings={fakeSettings}
        {...defaultProps}
        {...props}
      />,
    );
  }

  beforeEach(() => {
    fakeAnnotationsService = {
      createPageNote: sinon.stub(),
    };
    fakeSettings = {
      enableExperimentalNewNoteButton: false,
    };
    fakeStore = {
      selectTab: sinon.stub(),
      isWaitingToAnchorAnnotations: sinon.stub().returns(false),
      selectedTab: sinon.stub().returns('annotation'),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
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

      it('should add a new page note on click', () => {
        fakeSettings.enableExperimentalNewNoteButton = true;
        fakeStore.selectedTab.returns('note');

        const wrapper = createComponent();
        wrapper.find('Button[data-testid="new-note-button"]').props().onClick();

        assert.calledOnce(fakeAnnotationsService.createPageNote);
      });
    });
  });

  describe('orphans tab', () => {
    it('should display orphans tab if there is 1 or more orphans', () => {
      const wrapper = createComponent({
        tabCounts: {
          ...defaultProps.tabCounts,
          orphan: 1,
        },
      });

      const orphanTab = wrapper.find('Tab[label="Orphans"]');
      assert.isTrue(orphanTab.exists());
    });

    it('should display orphans tab as selected when it is active', () => {
      fakeStore.selectedTab.returns('orphan');

      const wrapper = createComponent({ tabCounts: { orphan: 1 } });

      const orphanTab = wrapper.find('Tab[label="Orphans"]');
      assert.isTrue(orphanTab.find('LinkButton').prop('pressed'));
    });

    it('should not display orphans tab if there are 0 orphans', () => {
      const wrapper = createComponent();

      const orphanTab = wrapper.find('Tab[label="Orphans"]');

      assert.isFalse(orphanTab.exists());
    });
  });

  describe('tab display and counts', () => {
    it('should not render count if there are no page notes', () => {
      const wrapper = createComponent({
        tabCounts: {
          ...defaultProps.tabCounts,
          note: 0,
        },
      });

      const noteTab = wrapper.find('Tab[label="Page notes"]');

      assert.equal(noteTab.text(), 'Page Notes');
    });

    it('should not display a message when its loading annotation count is 0', () => {
      const wrapper = createComponent({
        isLoading: true,
        tabCounts: {
          ...defaultProps.tabCounts,
          annotation: 0,
        },
      });
      assert.isFalse(
        wrapper.exists('[data-testid="annotations-unavailable-message"]'),
      );
    });

    it('should not display a message when its loading notes count is 0', () => {
      fakeStore.selectedTab.returns('note');
      const wrapper = createComponent({
        isLoading: true,
        tabCounts: {
          ...defaultProps.tabCounts,
          note: 0,
        },
      });
      assert.isFalse(
        wrapper.exists('[data-testid="notes-unavailable-message"]'),
      );
    });

    it('should not display the longer version of the no annotations message when there are no annotations and isWaitingToAnchorAnnotations is true', () => {
      fakeStore.isWaitingToAnchorAnnotations.returns(true);
      const wrapper = createComponent({
        isLoading: false,
        tabCounts: {
          ...defaultProps.tabCounts,
          annotationn: 0,
        },
      });
      assert.isFalse(
        wrapper.exists('[data-testid="annotations-unavailable-message"]'),
      );
    });

    it('should display the longer version of the no notes message when there are no notes', () => {
      fakeStore.selectedTab.returns('note');
      const wrapper = createComponent({
        tabCounts: {
          ...defaultProps.tabCounts,
          note: 0,
        },
      });

      assert.include(
        wrapper.find('Card[data-testid="notes-unavailable-message"]').text(),
        'There are no page notes in this group',
      );
    });

    it('should display the longer version of the no annotations message when there are no annotations', () => {
      const wrapper = createComponent({
        tabCounts: {
          ...defaultProps.tabCounts,
          annotation: 0,
        },
      });
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
    { label: 'Orphans', tab: 'orphan' },
  ].forEach(({ label, tab }) => {
    it(`should change the selected tab when "${label}" tab is clicked`, () => {
      // Pre-select a different tab than the one we are about to click.
      fakeStore.selectedTab.returns('other-tab');

      const wrapper = createComponent({
        // Make the "Orphans" tab appear.
        tabCounts: {
          ...defaultProps.tabCounts,
          orphan: 1,
        },
      });

      findButton(wrapper, label).simulate('click');

      assert.calledWith(fakeStore.selectTab, tab);
    });
  });

  it('does not change the selected tab if it is already selected', () => {
    fakeStore.selectedTab.returns('note');
    const wrapper = createComponent({});

    findButton(wrapper, 'Page Notes').simulate('click');

    assert.notCalled(fakeStore.selectTab);
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => {
        return createComponent({
          tabCounts: {
            annotation: 1,
            note: 2,
            orphan: 3,
          },
        });
      },
    }),
  );
});
