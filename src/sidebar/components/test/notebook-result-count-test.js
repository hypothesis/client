import { mount } from 'enzyme';
import { createElement } from 'preact';

import NotebookResultCount from '../notebook-result-count';
import { $imports } from '../notebook-result-count';

describe('NotebookResultCount', () => {
  let fakeCountVisible;
  let fakeIsLoading;
  let fakeAnnotationResultCount;
  let fakeUseRootThread;
  let fakeStore;

  const createComponent = () => {
    return mount(<NotebookResultCount />);
  };

  beforeEach(() => {
    fakeCountVisible = sinon.stub().returns(0);
    fakeUseRootThread = sinon.stub().returns({ children: [] });
    fakeIsLoading = sinon.stub().returns(false);
    fakeAnnotationResultCount = sinon.stub().returns(0);

    fakeStore = {
      forcedVisibleAnnotations: sinon.stub().returns([]),
      hasAppliedFilter: sinon.stub().returns(false),
      isLoading: fakeIsLoading,
      annotationResultCount: fakeAnnotationResultCount,
    };

    $imports.$mock({
      './hooks/use-root-thread': fakeUseRootThread,
      '../store/use-store': { useStoreProxy: () => fakeStore },
      '../util/thread': { countVisible: fakeCountVisible },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('when there are no results', () => {
    it('should show "No Results" if no filters are applied', () => {
      fakeStore.hasAppliedFilter.returns(false);
      fakeUseRootThread.returns({ children: [] });

      const wrapper = createComponent();

      assert.equal(wrapper.text(), 'No results');
    });

    it('should show "No Results" if filters are applied', () => {
      fakeStore.hasAppliedFilter.returns(true);
      fakeUseRootThread.returns({ children: [] });

      const wrapper = createComponent();

      assert.equal(wrapper.text(), 'No results');
    });
  });

  context('no applied filter', () => {
    [
      {
        thread: { children: [1] },
        visibleCount: 1,
        expected: '1 thread(1 annotation)',
      },
      {
        thread: { children: [1] },
        visibleCount: 2,
        expected: '1 thread(2 annotations)',
      },
      {
        thread: { children: [1, 2] },
        visibleCount: 2,
        expected: '2 threads(2 annotations)',
      },
    ].forEach(test => {
      it('should render a count of threads and annotations', () => {
        fakeCountVisible.returns(test.visibleCount);
        fakeUseRootThread.returns(test.thread);

        const wrapper = createComponent();

        assert.equal(wrapper.text(), test.expected);
      });
    });
  });

  context('with one or more applied filters', () => {
    [
      {
        forcedVisible: [],
        thread: { children: [1] },
        visibleCount: 1,
        expected: '1 result',
      },
      {
        forcedVisible: [],
        thread: { children: [1] },
        visibleCount: 2,
        expected: '2 results',
      },
      {
        forcedVisible: [1],
        thread: { children: [1] },
        visibleCount: 3,
        expected: '2 results(and 1 more)',
      },
    ].forEach(test => {
      it('should render a count of results', () => {
        fakeStore.hasAppliedFilter.returns(true);
        fakeStore.forcedVisibleAnnotations.returns(test.forcedVisible);
        fakeUseRootThread.returns(test.thread);
        fakeCountVisible.returns(test.visibleCount);

        const wrapper = createComponent();

        assert.equal(wrapper.text(), test.expected);
      });
    });
  });

  context('when loading', () => {
    beforeEach(() => {
      fakeIsLoading.returns(true);
    });

    it('shows a loading spinner', () => {
      const wrapper = createComponent();
      assert.isTrue(wrapper.find('Spinner').exists());
    });

    it('shows annotation count if there are any matching annotations being fetched', () => {
      fakeUseRootThread.returns({ children: [1, 2] });
      // Setting countVisible to something different to demonstrate that
      // resultCount is used while loading
      fakeCountVisible.returns(5);
      fakeAnnotationResultCount.returns(2);

      const wrapper = createComponent();

      assert.equal(wrapper.text(), '(2 annotations)');
    });
  });
});
