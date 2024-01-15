import { mount } from 'enzyme';

import { useRootThread, $imports } from '../use-root-thread';

describe('sidebar/components/hooks/use-root-thread', () => {
  let fakeStore;
  let fakeThreadAnnotations;
  let lastRootThread;

  beforeEach(() => {
    fakeStore = {
      allAnnotations: sinon.stub().returns(['1', '2']),
      filterQuery: sinon.stub().returns('itchy'),
      hasAppliedFilter: sinon.stub().returns(false),
      hasSelectedAnnotations: sinon.stub().returns(false),
      isFeatureEnabled: sinon.stub().returns(true),
      route: sinon.stub().returns('sidebar'),
      selectionState: sinon.stub().returns({ hi: 'there' }),
      getFilterValues: sinon.stub().returns({ user: 'hotspur' }),
    };
    fakeThreadAnnotations = sinon.stub().returns({
      rootThread: {
        children: [],
      },
    });

    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
      '../../helpers/thread-annotations': {
        threadAnnotations: fakeThreadAnnotations,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function DummyComponent() {
    lastRootThread = useRootThread();
  }

  it('should return results of `threadAnnotations` with current thread state', () => {
    mount(<DummyComponent />);

    const threadState = fakeThreadAnnotations.getCall(0).args[0];
    assert.deepEqual(threadState.annotations, ['1', '2']);
    assert.equal(threadState.selection.filterQuery, 'itchy');
    assert.equal(threadState.showTabs, true);
    assert.equal(threadState.selection.filters.user, 'hotspur');
    assert.equal(lastRootThread, fakeThreadAnnotations());
  });

  [
    { route: 'sidebar', showTabs: true },
    { route: 'notebook', showTabs: false },
  ].forEach(({ route, showTabs }) => {
    it('filters by tab in the sidebar only', () => {
      fakeStore.route.returns(route);

      mount(<DummyComponent />);
      const threadState = fakeThreadAnnotations.getCall(0).args[0];

      assert.equal(threadState.showTabs, showTabs);
    });
  });

  [
    // When using search UI, always filter by tab.
    { newSearchUI: true, hasFilter: true, hasSelection: false, showTabs: true },

    // When using old search UI, only filter by tab if no selection or filter
    // is active.
    {
      newSearchUI: false,
      hasFilter: true,
      hasSelection: false,
      showTabs: false,
    },
    {
      newSearchUI: false,
      hasFilter: false,
      hasSelection: true,
      showTabs: false,
    },
    {
      newSearchUI: false,
      hasFilter: false,
      hasSelection: false,
      showTabs: true,
    },
  ].forEach(({ newSearchUI, hasFilter, hasSelection, showTabs }) => {
    it('if `search_panel` is disabled, does not filter by tab if there is a filter active', () => {
      fakeStore.route.returns('sidebar');
      fakeStore.isFeatureEnabled.withArgs('search_panel').returns(newSearchUI);
      fakeStore.hasAppliedFilter.returns(hasFilter);
      fakeStore.hasSelectedAnnotations.returns(hasSelection);

      mount(<DummyComponent />);
      const threadState = fakeThreadAnnotations.getCall(0).args[0];

      assert.equal(threadState.showTabs, showTabs);
    });
  });
});
