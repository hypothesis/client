import { ProfileIcon } from '@hypothesis/frontend-shared';
import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import NotebookFilters from '../NotebookFilters';
import { $imports } from '../NotebookFilters';

describe('NotebookFilters', () => {
  let fakeStore;
  let fakeUseUserFilterOptions;

  const createComponent = () => {
    return mount(<NotebookFilters />);
  };

  beforeEach(() => {
    fakeUseUserFilterOptions = sinon.stub().returns([]);

    fakeStore = {
      getFilter: sinon.stub().returns(undefined),
      setFilter: sinon.stub(),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      './hooks/use-filter-options': {
        useUserFilterOptions: fakeUseUserFilterOptions,
      },
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should render a user filter with options', () => {
    fakeUseUserFilterOptions.returns([
      { display: 'One User', value: 'oneuser' },
    ]);

    const wrapper = createComponent();

    const props = wrapper.find('FilterSelect').props();
    assert.deepEqual(props.options[0], {
      display: 'One User',
      value: 'oneuser',
    });
    assert.deepEqual(props.defaultOption, { value: '', display: 'Everybody' });
    assert.equal(props.icon, ProfileIcon);
    assert.equal(props.title, 'Filter by user');
    assert.equal(props.options.length, 1);
    assert.isUndefined(props.selectedOption);
  });

  it('should render the filter with a selected option if a user filter is applied', () => {
    fakeUseUserFilterOptions.returns([
      { display: 'One User', value: 'oneuser' },
    ]);
    fakeStore.getFilter
      .withArgs('user')
      .returns({ display: 'One User', value: 'oneuser' });

    const wrapper = createComponent();

    assert.deepEqual(wrapper.find('FilterSelect').props().selectedOption, {
      display: 'One User',
      value: 'oneuser',
    });
  });

  it('should set a user filter when a user is selected', () => {
    fakeUseUserFilterOptions.returns([
      { display: 'One User', value: 'oneuser' },
    ]);

    const wrapper = createComponent();

    wrapper
      .find('FilterSelect')
      .props()
      .onSelect({ display: 'One User', value: 'oneuser' });

    assert.calledOnce(fakeStore.setFilter);
    assert.calledWith(
      fakeStore.setFilter,
      'user',
      sinon.match({ display: 'One User', value: 'oneuser' }),
    );
  });
});
