import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import SearchPanel, { $imports } from '../SearchPanel';

describe('SearchPanel', () => {
  let fakeStore;

  beforeEach(() => {
    fakeStore = {
      setFilterQuery: sinon.stub(),
      filterQuery: sinon.stub().returns(null),
      closeSidebarPanel: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../store': {
        useSidebarStore: () => fakeStore,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createSearchPanel() {
    return mount(<SearchPanel />);
  }

  [true, false].forEach(active => {
    it('clears selection when search panel becomes inactive', () => {
      const wrapper = createSearchPanel();

      wrapper.find('SidebarPanel').props().onActiveChanged(active);

      if (!active) {
        assert.calledWith(fakeStore.setFilterQuery, null);
      } else {
        assert.notCalled(fakeStore.setFilterQuery);
      }
    });
  });

  it('closes search panel when Escape is pressed in search field', () => {
    const wrapper = createSearchPanel();

    wrapper
      .find('SearchField')
      .props()
      .onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));

    assert.calledWith(fakeStore.closeSidebarPanel, 'searchAnnotations');
  });

  it('updates query onSearch', () => {
    const wrapper = createSearchPanel();

    wrapper.find('SearchField').props().onSearch('foo');

    assert.calledWith(fakeStore.setFilterQuery, 'foo');
  });

  [
    { query: null, searchStatusIsRendered: false },
    { query: '', searchStatusIsRendered: false },
    { query: 'foo', searchStatusIsRendered: true },
  ].forEach(({ query, searchStatusIsRendered }) => {
    it("renders SearchStatus only when there's an active query", () => {
      fakeStore.filterQuery.returns(query);
      const wrapper = createSearchPanel();

      assert.equal(wrapper.exists('SearchStatus'), searchStatusIsRendered);
    });
  });
});
