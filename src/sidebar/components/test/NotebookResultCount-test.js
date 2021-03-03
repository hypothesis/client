import { mount } from 'enzyme';

import NotebookResultCount from '../NotebookResultCount';
import { $imports } from '../NotebookResultCount';

describe('NotebookResultCount', () => {
  let fakeCountVisible;
  let fakeUseRootThread;

  const createComponent = (props = {}) => {
    return mount(
      <NotebookResultCount
        forcedVisibleCount={0}
        isFiltered={false}
        isLoading={false}
        resultCount={0}
        {...props}
      />
    );
  };

  beforeEach(() => {
    fakeCountVisible = sinon.stub().returns(0);
    fakeUseRootThread = sinon.stub().returns({ children: [] });

    $imports.$mock({
      './hooks/use-root-thread': fakeUseRootThread,
      '../helpers/thread': { countVisible: fakeCountVisible },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  context('when there are no results', () => {
    it('should show "No Results" if no filters are applied', () => {
      fakeUseRootThread.returns({ children: [] });

      const wrapper = createComponent({ isFiltered: false });

      assert.equal(wrapper.text(), 'No results');
    });

    it('should show "No Results" if filters are applied', () => {
      fakeUseRootThread.returns({ children: [] });

      const wrapper = createComponent({ isFiltered: true });

      assert.equal(wrapper.text(), 'No results');
    });
  });

  context('no applied filter', () => {
    [
      {
        thread: { children: [1] },
        visibleCount: 1,
        expected: '1 result',
      },
      {
        thread: { children: [1] },
        visibleCount: 2,
        expected: '1 result',
      },
      {
        thread: { children: [1, 2] },
        visibleCount: 2,
        expected: '2 results',
      },
    ].forEach(test => {
      it('should render a count of top-level threads', () => {
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
        forcedVisibleCount: 0,
        thread: { children: [1] },
        visibleCount: 1,
        expected: '1 result',
      },
      {
        forcedVisibleCount: 0,
        thread: { children: [1] },
        visibleCount: 2,
        expected: '2 results',
      },
      {
        forcedVisibleCount: 1,
        thread: { children: [1] },
        visibleCount: 3,
        expected: '2 results(and 1 more)',
      },
    ].forEach(test => {
      it('should render a count of results', () => {
        fakeUseRootThread.returns(test.thread);
        fakeCountVisible.returns(test.visibleCount);

        const wrapper = createComponent({
          forcedVisibleCount: test.forcedVisibleCount,
          isFiltered: true,
        });

        assert.equal(wrapper.text(), test.expected);
      });
    });
  });

  context('when loading', () => {
    it('shows a loading spinner', () => {
      const wrapper = createComponent({ isLoading: true });
      assert.isTrue(wrapper.find('Spinner').exists());
    });
  });
});
