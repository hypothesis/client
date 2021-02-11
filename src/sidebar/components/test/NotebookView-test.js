import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import mockImportedComponents from '../../../test-util/mock-imported-components';

import NotebookView, { $imports } from '../NotebookView';

describe('NotebookView', () => {
  let fakeLoadAnnotationsService;
  let fakeUseRootThread;
  let fakeScrollIntoView;
  let fakeStore;

  beforeEach(() => {
    fakeLoadAnnotationsService = {
      load: sinon.stub(),
    };

    fakeUseRootThread = sinon.stub().returns({});

    fakeScrollIntoView = sinon.stub();

    fakeStore = {
      focusedGroup: sinon.stub().returns({}),
      forcedVisibleThreads: sinon.stub().returns([]),
      getFilterValues: sinon.stub().returns({}),
      hasAppliedFilter: sinon.stub().returns(false),
      isLoading: sinon.stub().returns(false),
      annotationResultCount: sinon.stub().returns(0),
      setSortKey: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      './hooks/use-root-thread': fakeUseRootThread,
      '../store/use-store': { useStoreProxy: () => fakeStore },
      'scroll-into-view': fakeScrollIntoView,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createComponent() {
    return mount(
      <NotebookView loadAnnotationsService={fakeLoadAnnotationsService} />
    );
  }

  it('loads annotations for the currently-focused group', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
    createComponent();

    assert.calledWith(
      fakeLoadAnnotationsService.load,
      sinon.match({ groupId: 'hallothere', maxResults: 5000 })
    );
    assert.calledWith(fakeStore.setSortKey, 'Newest');
  });

  it('renders the current group name', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
    const wrapper = createComponent();

    assert.equal(wrapper.find('.NotebookView__heading').text(), 'Hallo');
  });

  it('renders a placeholder if group name missing', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere' });
    const wrapper = createComponent();

    assert.equal(wrapper.find('.NotebookView__heading').text(), '…');
  });

  it('renders results (counts)', () => {
    const wrapper = createComponent();
    assert.isTrue(wrapper.find('NotebookResultCount').exists());
  });

  it('renders filters', () => {
    const wrapper = createComponent();
    assert.isTrue(wrapper.find('NotebookFilters').exists());
  });

  describe('pagination', () => {
    it('passes the current pagination page to `PaginatedThreadList`', () => {
      const wrapper = createComponent();

      assert.equal(wrapper.find('PaginatedThreadList').props().currentPage, 1);
    });

    it('updates the pagination page when `onChangePage` callack invoked', () => {
      const wrapper = createComponent();
      const callback = wrapper.find('PaginatedThreadList').props().onChangePage;

      act(() => {
        callback(2);
      });

      wrapper.update();

      assert.equal(wrapper.find('PaginatedThreadList').props().currentPage, 2);
    });

    it('scrolls to top of view when pagination page is changed', () => {
      const wrapper = createComponent();
      const callback = wrapper.find('PaginatedThreadList').props().onChangePage;

      act(() => {
        callback(2);
      });

      assert.calledOnce(fakeScrollIntoView);

      act(() => {
        callback(2);
      });

      // It is not called again because the page number did not _change_
      assert.calledOnce(fakeScrollIntoView);
    });

    it('resets pagination if filters change', () => {
      const wrapper = createComponent();
      const callback = wrapper.find('PaginatedThreadList').props().onChangePage;

      act(() => {
        callback(2);
      });

      fakeStore.getFilterValues.returns({ foo: 'bar' });

      wrapper.setProps({});

      assert.equal(wrapper.find('PaginatedThreadList').props().currentPage, 1);
    });
  });
});
