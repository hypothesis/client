import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import FilterAnnotationsStatus, { $imports } from '../FilterAnnotationsStatus';

function getFocusState() {
  return {
    active: false,
    configured: false,
    focusDisplayName: '',
  };
}

describe('FilterAnnotationsStatus', () => {
  let fakeStore;
  let fakeUseRootThread;
  let fakeThreadUtil;

  const createComponent = () => {
    return mount(<FilterAnnotationsStatus />);
  };

  beforeEach(() => {
    fakeThreadUtil = {
      countVisible: sinon.stub().returns(0),
    };
    fakeStore = {
      annotationCount: sinon.stub(),
      clearSelection: sinon.stub(),
      directLinkedAnnotationId: sinon.stub(),
      focusState: sinon.stub().returns(getFocusState()),
      forcedVisibleThreads: sinon.stub().returns([]),
      isLoading: sinon.stub().returns(false),
      selectedAnnotations: sinon.stub().returns([]),
      toggleFocusMode: sinon.stub(),
    };

    fakeUseRootThread = sinon.stub().returns({});

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../hooks/use-root-thread': { useRootThread: fakeUseRootThread },
      '../../store': { useSidebarStore: () => fakeStore },
      '../../helpers/thread': fakeThreadUtil,
    });
  });

  function assertFilterText(wrapper, text) {
    const filterText = wrapper.find('[role="status"]').text();
    assert.equal(filterText, text);
  }

  function assertButton(wrapper, expected) {
    const button = wrapper.find('Button[data-testid="clear-button"]');
    const buttonProps = button.props();

    assert.equal(buttonProps.title, expected.text);
    assert.equal(button.find('CancelIcon').exists(), !!expected.icon);
    buttonProps.onClick();
    assert.calledOnce(expected.callback);
  }

  context('Loading', () => {
    it('shows a loading spinner', () => {
      fakeStore.isLoading.returns(true);
      const wrapper = createComponent();

      assert.isTrue(wrapper.find('Spinner').exists());
    });
  });

  context('no search filters active', () => {
    it('should render hidden but available to screen readers', () => {
      const wrapper = createComponent();
      const containerEl = wrapper
        .find('div[data-testid="filter-status-container"]')
        .getDOMNode();

      assert.include(containerEl.className, 'sr-only');
      assertFilterText(wrapper, '');
    });
  });

  context('selected annotations', () => {
    beforeEach(() => {
      fakeStore.selectedAnnotations.returns([1]);
    });

    it('should show the count of annotations', () => {
      assertFilterText(createComponent(), 'Showing 1 annotation');
    });

    it('should pluralize annotations when necessary', () => {
      fakeStore.selectedAnnotations.returns([1, 2, 3, 4]);

      assertFilterText(createComponent(), 'Showing 4 annotations');
    });

    it('should show the count of additionally-shown top-level annotations', () => {
      // In selection mode, "forced visible" count is computed by subtracting
      // the selectedCount from the count of all visible top-level threads
      // (children/replies are ignored in this count)
      fakeUseRootThread.returns({
        id: '__default__',
        children: [
          { id: '1', annotation: { $tag: '1' }, visible: true, children: [] },
          {
            id: '2',
            annotation: { $tag: '2' },
            visible: true,
            children: [
              {
                id: '2a',
                annotation: { $tag: '2a' },
                visible: true,
                children: [],
              },
            ],
          },
        ],
      });
      assertFilterText(createComponent(), 'Showing 1 annotation (and 1 more)');
    });

    it('should provide a "Show all" button that shows a count of all annotations', () => {
      fakeStore.annotationCount.returns(5);
      assertButton(createComponent(), {
        text: 'Show all (5)',
        icon: true,
        callback: fakeStore.clearSelection,
      });
    });

    it('should not show count of annotations on "Show All" button if direct-linked annotation present', () => {
      fakeStore.annotationCount.returns(5);
      fakeStore.directLinkedAnnotationId.returns(1);
      assertButton(createComponent(), {
        text: 'Show all',
        icon: true,
        callback: fakeStore.clearSelection,
      });
    });
  });

  context('user-focus mode active', () => {
    beforeEach(() => {
      fakeStore.focusState.returns({
        active: true,
        configured: true,
        displayName: 'Ebenezer Studentolog',
      });
      fakeThreadUtil.countVisible.returns(1);
    });

    it('should show a count of annotations by the focused user', () => {
      assertFilterText(
        createComponent(),
        'Showing 1 annotation by Ebenezer Studentolog',
      );
    });

    it('should pluralize annotations when needed', () => {
      fakeThreadUtil.countVisible.returns(3);
      assertFilterText(
        createComponent(),
        'Showing 3 annotations by Ebenezer Studentolog',
      );
    });

    it('should show a no results message when user has no annotations', () => {
      fakeThreadUtil.countVisible.returns(0);
      assertFilterText(
        createComponent(),
        'No annotations by Ebenezer Studentolog',
      );
    });

    it('should provide a "Show all" button that toggles user focus mode', () => {
      assertButton(createComponent(), {
        text: 'Show all',
        icon: false,
        callback: fakeStore.toggleFocusMode,
      });
    });
  });

  context('user-focus mode active, force-expanded threads', () => {
    beforeEach(() => {
      fakeStore.focusState.returns({
        active: true,
        configured: true,
        displayName: 'Ebenezer Studentolog',
      });
      fakeStore.forcedVisibleThreads.returns([1, 2]);
      fakeThreadUtil.countVisible.returns(3);
    });

    it('should show a count of annotations by the focused user', () => {
      assertFilterText(
        createComponent(),
        'Showing 1 annotation by Ebenezer Studentolog (and 2 more)',
      );
    });

    it('should provide a "Show all" button', () => {
      const wrapper = createComponent();
      const button = wrapper.find('Button[data-testid="clear-button"]');

      assert.equal(button.text(), 'Reset filters');
      button.props().onClick();
      assert.calledOnce(fakeStore.clearSelection);
    });
  });

  context('user-focus mode active, selected annotations', () => {
    beforeEach(() => {
      fakeStore.focusState.returns({
        active: true,
        configured: true,
        displayName: 'Ebenezer Studentolog',
      });
      fakeStore.selectedAnnotations.returns([1, 2]);
    });

    it('should ignore user and display selected annotations', () => {
      assertFilterText(createComponent(), 'Showing 2 annotations');
    });

    it('should provide a "Show all" button', () => {
      assertButton(createComponent(), {
        text: 'Show all',
        icon: true,
        callback: fakeStore.clearSelection,
      });
    });
  });

  context('user-focus mode configured but inactive', () => {
    beforeEach(() => {
      fakeStore.focusState.returns({
        active: false,
        configured: true,
        displayName: 'Ebenezer Studentolog',
      });
      fakeThreadUtil.countVisible.returns(7);
    });

    it("should show a count of everyone's annotations", () => {
      assertFilterText(createComponent(), 'Showing 7 annotations');
    });

    it('should provide a button to activate user-focused mode', () => {
      assertButton(createComponent(), {
        text: 'Show only Ebenezer Studentolog',
        icon: false,
        callback: fakeStore.toggleFocusMode,
      });
    });
  });

  it('shows focused page range', () => {
    fakeStore.focusState.returns({
      active: true,
      configured: true,
      pageRange: '5-10',
    });
    fakeThreadUtil.countVisible.returns(7);
    assertFilterText(createComponent(), 'Showing 7 annotations in pages 5-10');
  });

  it('shows focused content range', () => {
    fakeStore.focusState.returns({
      active: true,
      configured: true,
      contentRange: 'Chapter 2',
    });
    fakeThreadUtil.countVisible.returns(3);
    assertFilterText(createComponent(), 'Showing 3 annotations in Chapter 2');
  });

  [{ pageRange: '5-10' }, { contentRange: 'Chapter 2' }].forEach(focusState => {
    it('shows button to reset focus mode if content focus is configured but inactive', () => {
      fakeStore.focusState.returns({
        active: false,
        configured: true,
        ...focusState,
      });
      fakeThreadUtil.countVisible.returns(7);
      assertButton(createComponent(), {
        text: 'Reset filter',
        icon: false,
        callback: fakeStore.toggleFocusMode,
      });
    });
  });
});
