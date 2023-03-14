import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import { ResultSizeError } from '../../search-client';
import NotebookView, { $imports } from '../NotebookView';

describe('NotebookView', () => {
  let fakeLoadAnnotationsService;
  let fakeUseRootThread;
  let fakeScrollIntoView;
  let fakeStore;
  let fakeStreamer;

  beforeEach(() => {
    fakeLoadAnnotationsService = {
      load: sinon.stub(),
    };

    fakeUseRootThread = sinon.stub().returns({});

    fakeScrollIntoView = sinon.stub();

    fakeStore = {
      directLinkedGroupId: sinon.stub().returns(null),
      focusedGroup: sinon.stub().returns({}),
      forcedVisibleThreads: sinon.stub().returns([]),
      getFilterValues: sinon.stub().returns({}),
      hasAppliedFilter: sinon.stub().returns(false),
      isLoading: sinon.stub().returns(false),
      annotationResultCount: sinon.stub().returns(0),
      setSortKey: sinon.stub(),
      hasFetchedProfile: sinon.stub().returns(true),
    };

    fakeStreamer = {
      connect: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      './hooks/use-root-thread': { useRootThread: fakeUseRootThread },
      '../store': { useSidebarStore: () => fakeStore },
      'scroll-into-view': fakeScrollIntoView,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createComponent() {
    return mount(
      <NotebookView
        loadAnnotationsService={fakeLoadAnnotationsService}
        streamer={fakeStreamer}
      />
    );
  }

  it('loads annotations for the currently-focused group', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
    createComponent();

    assert.calledWith(
      fakeLoadAnnotationsService.load,
      sinon.match({
        groupId: 'hallothere',
        maxResults: 5000,
        sortBy: 'updated',
        sortOrder: 'desc',
        onError: sinon.match.func,
      })
    );
    assert.calledWith(fakeStore.setSortKey, 'Newest');
  });

  it('loads annotations for the direct-linked group if there is no focused group', () => {
    fakeStore.focusedGroup.returns(null);
    fakeStore.directLinkedGroupId.returns('direct123');

    createComponent();

    assert.calledWith(
      fakeLoadAnnotationsService.load,
      sinon.match({
        groupId: 'direct123',
        maxResults: 5000,
        sortBy: 'updated',
        sortOrder: 'desc',
        onError: sinon.match.func,
      })
    );
  });

  it('does not load annotations if there is no focused or direct-linked group', () => {
    fakeStore.focusedGroup.returns(null);
    fakeStore.directLinkedGroupId.returns(null);

    createComponent();

    assert.notCalled(fakeLoadAnnotationsService.load);
  });

  it('shows a message if too many annotations to load', () => {
    // Simulate the loading service emitting an error indicating
    // too many annotations to load
    fakeLoadAnnotationsService.load.callsFake(options => {
      options.onError(new ResultSizeError(5000));
    });
    fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
    const wrapper = createComponent();

    const message = wrapper.find('[data-testid="notebook-messages"]');
    assert.include(message.text(), 'up to 5000 results at a time');
    assert.isTrue(message.exists());
  });

  it('renders the current group name', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
    const wrapper = createComponent();

    assert.equal(
      wrapper.find('[data-testid="notebook-group-name"]').text(),
      'Hallo'
    );
  });

  it('renders a placeholder if group name missing', () => {
    fakeStore.focusedGroup.returns({ id: 'hallothere' });
    const wrapper = createComponent();

    assert.equal(
      wrapper.find('[data-testid="notebook-group-name"]').text(),
      '…'
    );
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

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => {
          fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
          return createComponent();
        },
      },
      {
        name: 'with message warning',
        content: () => {
          fakeLoadAnnotationsService.load.callsFake(options => {
            options.onError(new ResultSizeError(5000));
          });
          fakeStore.focusedGroup.returns({ id: 'hallothere', name: 'Hallo' });
          return createComponent();
        },
      },
    ])
  );
});
