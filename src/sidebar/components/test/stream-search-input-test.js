import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import StreamSearchInput from '../stream-search-input';
import { $imports } from '../stream-search-input';

import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('StreamSearchInput', () => {
  let fakeLocation;
  let fakeRootScope;

  beforeEach(() => {
    fakeLocation = {
      path: sinon.stub().returnsThis(),
      search: sinon.stub().returns({ q: 'the-query' }),
    };
    fakeRootScope = {
      $apply: callback => callback(),
      $on: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createSearchInput(props = {}) {
    return mount(
      <StreamSearchInput
        $location={fakeLocation}
        $rootScope={fakeRootScope}
        {...props}
      />
    );
  }

  it('displays current "q" search param', () => {
    const wrapper = createSearchInput();
    assert.equal(wrapper.find('SearchInput').prop('query'), 'the-query');
  });

  it('sets path and query when user searches', () => {
    const wrapper = createSearchInput();
    act(() => {
      wrapper
        .find('SearchInput')
        .props()
        .onSearch('new-query');
    });
    assert.calledWith(fakeLocation.path, '/stream');
    assert.calledWith(fakeLocation.search, { q: 'new-query' });
  });

  it('updates query when changed in URL', () => {
    fakeLocation.search.returns({ q: 'query-b' });
    const wrapper = createSearchInput();

    assert.calledOnce(fakeRootScope.$on);
    assert.calledWith(fakeRootScope.$on, '$locationChangeSuccess');

    act(() => {
      fakeRootScope.$on.lastCall.callback();
    });

    // Check that new query is displayed.
    wrapper.update();
    assert.equal(wrapper.find('SearchInput').prop('query'), 'query-b');
  });
});
