import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import SearchStatus, { $imports } from '../SearchStatus';

describe('SearchStatus', () => {
  let fakeStore;
  let fakeUseRootThread;
  let fakeThreadUtil;

  const createComponent = () => {
    return mount(<SearchStatus />);
  };

  beforeEach(() => {
    fakeThreadUtil = {
      countVisible: sinon.stub().returns(0),
    };
    fakeStore = {
      clearSelection: sinon.stub(),
      filterQuery: sinon.stub().returns(null),
      forcedVisibleThreads: sinon.stub().returns([]),
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

  function clickClearButton(wrapper) {
    const button = wrapper.find('Button[data-testid="clear-button"]');
    assert.equal(button.text(), 'Clear search');
    assert.isTrue(button.find('CancelIcon').exists());
    button.props().onClick();
    assert.calledOnce(fakeStore.clearSelection);
  }

  context('when no search filters are active', () => {
    it('should render hidden but available to screen readers', () => {
      const wrapper = createComponent();
      const containerEl = wrapper
        .find('div[data-testid="search-status-container"]')
        .getDOMNode();

      assert.include(containerEl.className, 'sr-only');
      assertFilterText(wrapper, '');
    });
  });

  context('when filtered by query', () => {
    beforeEach(() => {
      fakeStore.filterQuery.returns('foobar');
      fakeThreadUtil.countVisible.returns(1);
    });

    it('should provide a "Clear search" button that clears the selection', () => {
      clickClearButton(createComponent());
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

  context('when filtered by query with force-expanded threads', () => {
    beforeEach(() => {
      fakeStore.filterQuery.returns('foobar');
      fakeStore.forcedVisibleThreads.returns([1, 2, 3]);
      fakeThreadUtil.countVisible.returns(5);
    });

    it('should show a separate count for results versus forced visible', () => {
      assertFilterText(createComponent(), "Showing 2 results for 'foobar'");
    });

    it('should provide a "Clear search" button that clears the selection', () => {
      clickClearButton(createComponent());
    });
  });
});
