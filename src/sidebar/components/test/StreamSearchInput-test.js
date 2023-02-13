import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { mockImportedComponents } from '../../../test-util/mock-imported-components';
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
      '../store': { useSidebarStore: () => fakeStore },
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
    assert.equal(wrapper.find('SearchInput').prop('query'), 'the-query');
  });

  it('sets path and query when user searches', () => {
    const wrapper = createSearchInput();
    act(() => {
      wrapper.find('SearchInput').props().onSearch('new-query');
    });
    assert.calledWith(fakeRouter.navigate, 'stream', { q: 'new-query' });
  });
});
