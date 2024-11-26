import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import { act } from 'preact/test-utils';

import StreamSearchInput, { $imports } from '../StreamSearchInput';

describe('StreamSearchInput', () => {
  let fakeRouter;
  let fakeStore;

  beforeEach(() => {
    fakeRouter = {
      navigate: sinon.stub(),
    };
    fakeStore = {
      routeParams: sinon.stub().returns({}),
    };
    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createSearchInput(props = {}) {
    return mount(<StreamSearchInput router={fakeRouter} {...props} />);
  }

  it('displays current "q" search param', () => {
    fakeStore.routeParams.returns({ q: 'the-query' });
    const wrapper = createSearchInput();
    assert.equal(wrapper.find('SearchField').prop('query'), 'the-query');
  });

  it('sets path and query when user searches', () => {
    const wrapper = createSearchInput();
    act(() => {
      wrapper.find('SearchField').props().onSearch('new-query');
    });
    assert.calledWith(fakeRouter.navigate, 'stream', { q: 'new-query' });
  });

  it('renders new SearchField when search panel feature is enabled', () => {
    const wrapper = createSearchInput();

    assert.isFalse(wrapper.exists('SearchInput'));
    assert.isTrue(wrapper.exists('SearchField'));
  });

  it('clears filter when clear button is clicked', () => {
    const wrapper = createSearchInput();
    act(() => {
      wrapper.find('SearchField').props().onClearSearch();
    });
    assert.calledWith(fakeRouter.navigate, 'stream', { q: '' });
  });
});
