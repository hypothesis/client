import { mount } from 'enzyme';
import { createElement } from 'preact';

import FilterStatus, { $imports } from '../filter-status';

import mockImportedComponents from '../../../test-util/mock-imported-components';

function getFilterState() {
  return {
    filterQuery: null,
    focusActive: false,
    focusConfigured: false,
    focusDisplayName: null,
    forcedVisibleCount: 0,
    selectedCount: 0,
  };
}

describe('FilterStatus', () => {
  let fakeStore;
  let fakeUseRootThread;
  let fakeThreadUtil;

  const createComponent = () => {
    return mount(<FilterStatus />);
  };

  beforeEach(() => {
    fakeThreadUtil = {
      countVisible: sinon.stub().returns(0),
    };
    fakeStore = {
      annotationCount: sinon.stub(),
      clearSelection: sinon.stub(),
      filterState: sinon.stub().returns(getFilterState()),
      toggleFocusMode: sinon.stub(),
    };

    fakeUseRootThread = sinon.stub().returns({});

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      './hooks/use-root-thread': fakeUseRootThread,
      '../store/use-store': callback => callback(fakeStore),
      '../util/thread': fakeThreadUtil,
    });
  });

  function assertFilterText(wrapper, text) {
    const filterText = wrapper.find('.filter-status__text').text();
    assert.equal(filterText, text);
  }

  function assertButton(wrapper, expected) {
    const buttonProps = wrapper.find('Button').props();

    assert.equal(buttonProps.buttonText, expected.text);
    assert.equal(buttonProps.icon, expected.icon);
    buttonProps.onClick();
    assert.calledOnce(expected.callback);
  }

  function assertClearButton(wrapper) {
    assertButton(wrapper, {
      text: 'Clear search',
      icon: 'cancel',
      callback: fakeStore.clearSelection,
    });
  }

  context('(State 1): no search filters active', () => {
    it('should return null if filter state indicates no active filters', () => {
      const wrapper = createComponent();
      assert.isEmpty(wrapper);
    });
  });

  context('(State 2): filtered by query', () => {
    let filterState;

    beforeEach(() => {
      filterState = { ...getFilterState(), filterQuery: 'foobar' };
      fakeStore.filterState.returns(filterState);
      fakeThreadUtil.countVisible.returns(1);
    });

    it('should provide a "Clear search" button that clears the selection', () => {
      assertClearButton(createComponent());
    });

    it('should show the count of matching results', () => {
      assertFilterText(createComponent(), "Showing 1 result for 'foobar'");
    });

    it('should show pluralized count of results when appropriate', () => {
      fakeThreadUtil.countVisible.returns(5);
      assertFilterText(createComponent(), "Showing 5 results for 'foobar'");
    });

    it('should show a no results message when no matches', () => {
      fakeThreadUtil.countVisible.returns(0);
      assertFilterText(createComponent(), "No results for 'foobar'");
    });
  });

  context('(State 3): filtered by query with force-expanded threads', () => {
    let filterState;

    beforeEach(() => {
      filterState = {
        ...getFilterState(),
        filterQuery: 'foobar',
        forcedVisibleCount: 3,
      };
      fakeStore.filterState.returns(filterState);
      fakeThreadUtil.countVisible.returns(5);
    });

    it('should show a separate count for results versus forced visible', () => {
      assertFilterText(
        createComponent(),
        "Showing 2 results for 'foobar' (and 3 more)"
      );
    });

    it('should provide a "Clear search" button that clears the selection', () => {
      assertClearButton(createComponent());
    });
  });

  context('(State 4): selected annotations', () => {
    let filterState;

    beforeEach(() => {
      filterState = {
        ...getFilterState(),
        selectedCount: 1,
      };
      fakeStore.filterState.returns(filterState);
    });

    it('should show the count of annotations', () => {
      assertFilterText(createComponent(), 'Showing 1 annotation');
    });

    it('should pluralize annotations when necessary', () => {
      filterState.selectedCount = 4;
      fakeStore.filterState.returns(filterState);

      assertFilterText(createComponent(), 'Showing 4 annotations');
    });

    it('should provide a "Show all" button that shows a count of all annotations', () => {
      fakeStore.annotationCount.returns(5);
      assertButton(createComponent(), {
        text: 'Show all (5)',
        icon: 'cancel',
        callback: fakeStore.clearSelection,
      });
    });
  });

  context('(State 5): user-focus mode active', () => {
    let filterState;

    beforeEach(() => {
      filterState = {
        ...getFilterState(),
        focusActive: true,
        focusConfigured: true,
        focusDisplayName: 'Ebenezer Studentolog',
      };
      fakeStore.filterState.returns(filterState);
      fakeThreadUtil.countVisible.returns(1);
    });

    it('should show a count of annotations by the focused user', () => {
      assertFilterText(
        createComponent(),
        'Showing 1 annotation by Ebenezer Studentolog'
      );
    });

    it('should pluralize annotations when needed', () => {
      fakeThreadUtil.countVisible.returns(3);
      assertFilterText(
        createComponent(),
        'Showing 3 annotations by Ebenezer Studentolog'
      );
    });

    it('should show a no results message when user has no annotations', () => {
      fakeThreadUtil.countVisible.returns(0);
      assertFilterText(
        createComponent(),
        'No annotations by Ebenezer Studentolog'
      );
    });

    it('should provide a "Show all" button that toggles user focus mode', () => {
      assertButton(createComponent(), {
        text: 'Show all',
        icon: null,
        callback: fakeStore.toggleFocusMode,
      });
    });
  });

  context('(State 6): user-focus mode active, filtered by query', () => {
    let filterState;

    beforeEach(() => {
      filterState = {
        ...getFilterState(),
        focusActive: true,
        focusConfigured: true,
        focusDisplayName: 'Ebenezer Studentolog',
        filterQuery: 'biscuits',
      };
      fakeStore.filterState.returns(filterState);
      fakeThreadUtil.countVisible.returns(1);
    });

    it('should show a count of annotations by the focused user', () => {
      assertFilterText(
        createComponent(),
        "Showing 1 result for 'biscuits' by Ebenezer Studentolog"
      );
    });

    it('should pluralize annotations when needed', () => {
      fakeThreadUtil.countVisible.returns(3);
      assertFilterText(
        createComponent(),
        "Showing 3 results for 'biscuits' by Ebenezer Studentolog"
      );
    });

    it('should show a no results message when user has no annotations', () => {
      fakeThreadUtil.countVisible.returns(0);
      assertFilterText(
        createComponent(),
        "No results for 'biscuits' by Ebenezer Studentolog"
      );
    });

    it('should provide a "Clear search" button', () => {
      assertClearButton(createComponent());
    });
  });

  context(
    '(State 7): user-focus mode active, filtered by query, force-expanded threads',
    () => {
      let filterState;

      beforeEach(() => {
        filterState = {
          ...getFilterState(),
          focusActive: true,
          focusConfigured: true,
          focusDisplayName: 'Ebenezer Studentolog',
          filterQuery: 'biscuits',
          forcedVisibleCount: 2,
        };
        fakeStore.filterState.returns(filterState);
        fakeThreadUtil.countVisible.returns(3);
      });

      it('should show a count of annotations by the focused user', () => {
        assertFilterText(
          createComponent(),
          "Showing 1 result for 'biscuits' by Ebenezer Studentolog (and 2 more)"
        );
      });

      it('should provide a "Clear search" button', () => {
        assertClearButton(createComponent());
      });
    }
  );

  context('(State 8): user-focus mode active, selected annotations', () => {
    let filterState;

    beforeEach(() => {
      filterState = {
        ...getFilterState(),
        focusActive: true,
        focusConfigured: true,
        focusDisplayName: 'Ebenezer Studentolog',
        selectedCount: 2,
      };
      fakeStore.filterState.returns(filterState);
    });

    it('should ignore user and display selected annotations', () => {
      assertFilterText(createComponent(), 'Showing 2 annotations');
    });

    it('should provide a "Show all" button', () => {
      assertButton(createComponent(), {
        text: 'Show all',
        icon: 'cancel',
        callback: fakeStore.clearSelection,
      });
    });
  });

  context('(State 9): user-focus mode active, force-expanded threads', () => {
    let filterState;

    beforeEach(() => {
      filterState = {
        ...getFilterState(),
        focusActive: true,
        focusConfigured: true,
        focusDisplayName: 'Ebenezer Studentolog',
        forcedVisibleCount: 3,
      };
      fakeStore.filterState.returns(filterState);
      fakeThreadUtil.countVisible.returns(7);
    });

    it('should show count of user results separately from forced-visible threads', () => {
      assertFilterText(
        createComponent(),
        'Showing 4 annotations by Ebenezer Studentolog (and 3 more)'
      );
    });

    it('should handle cases when there are no focused-user annotations', () => {
      filterState = { ...filterState, forcedVisibleCount: 7 };
      fakeStore.filterState.returns(filterState);
      assertFilterText(
        createComponent(),
        'No annotations by Ebenezer Studentolog (and 7 more)'
      );
    });

    it('should provide a "Reset filters" button', () => {
      assertButton(createComponent(), {
        text: 'Reset filters',
        icon: null,
        callback: fakeStore.clearSelection,
      });
    });
  });

  context('(State 10): user-focus mode configured but inactive', () => {
    let filterState;

    beforeEach(() => {
      filterState = {
        ...getFilterState(),
        focusActive: false,
        focusConfigured: true,
        focusDisplayName: 'Ebenezer Studentolog',
      };
      fakeStore.filterState.returns(filterState);
      fakeThreadUtil.countVisible.returns(7);
    });

    it("should show a count of everyone's annotations", () => {
      assertFilterText(createComponent(), 'Showing 7 annotations');
    });

    it('should provide a button to activate user-focused mode', () => {
      assertButton(createComponent(), {
        text: 'Show only Ebenezer Studentolog',
        icon: null,
        callback: fakeStore.toggleFocusMode,
      });
    });
  });
});
