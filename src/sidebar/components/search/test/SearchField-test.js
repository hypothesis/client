import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';

import SearchField, { $imports } from '../SearchField';

describe('SearchField', () => {
  let fakeStore;
  let container;
  let wrappers;

  const createSearchField = (props = {}) => {
    const wrapper = mount(<SearchField {...props} />, { attachTo: container });
    wrappers.push(wrapper);
    return wrapper;
  };

  function typeQuery(wrapper, query) {
    const input = wrapper.find('input');
    input.getDOMNode().value = query;
    input.simulate('input');
  }

  beforeEach(() => {
    wrappers = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    fakeStore = { isLoading: sinon.stub().returns(false) };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    wrappers.forEach(wrapper => wrapper.unmount());
    container.remove();
    $imports.$restore();
  });

  it('displays the active query', () => {
    const wrapper = createSearchField({ query: 'foo' });
    assert.equal(wrapper.find('input').prop('value'), 'foo');
  });

  it('resets input field value to active query when active query changes', () => {
    const wrapper = createSearchField({ query: 'foo' });

    // Simulate user editing the pending query, but not committing it.
    typeQuery(wrapper, 'pending-query');

    // Check that the pending query is displayed.
    assert.equal(wrapper.find('input').prop('value'), 'pending-query');

    // Simulate active query being reset.
    wrapper.setProps({ query: '' });

    assert.equal(wrapper.find('input').prop('value'), '');
  });

  it('invokes `onSearch` with pending query when form is submitted', () => {
    const onSearch = sinon.stub();
    const wrapper = createSearchField({ query: 'foo', onSearch });
    typeQuery(wrapper, 'new-query');
    wrapper.find('form').simulate('submit');
    assert.calledWith(onSearch, 'new-query');
  });

  it('does not set an initial empty query when form is submitted', () => {
    // If the first query entered is empty, it will be ignored
    const onSearch = sinon.stub();
    const wrapper = createSearchField({ onSearch });
    typeQuery(wrapper, '');
    wrapper.find('form').simulate('submit');
    assert.notCalled(onSearch);
  });

  it('sets subsequent empty queries if entered', () => {
    // If there has already been at least one query set, subsequent
    // empty queries will be honored
    const onSearch = sinon.stub();
    const wrapper = createSearchField({ query: 'foo', onSearch });
    typeQuery(wrapper, '');
    wrapper.find('form').simulate('submit');
    assert.calledWith(onSearch, '');
  });

  it('disables input when app is in a "loading" state', () => {
    fakeStore.isLoading.returns(true);

    const wrapper = createSearchField();
    const { placeholder, disabled } = wrapper.find('Input').props();

    assert.equal(placeholder, 'Loading…');
    assert.isTrue(disabled);
  });

  it('doesn\'t disable input when app is not in "loading" state', () => {
    fakeStore.isLoading.returns(false);

    const wrapper = createSearchField();
    const { placeholder, disabled } = wrapper.find('Input').props();

    assert.equal(placeholder, 'Search annotations…');
    assert.isFalse(disabled);
  });

  it('focuses search input when "/" is pressed outside of the component element', () => {
    const wrapper = createSearchField();
    const searchInputEl = wrapper.find('input').getDOMNode();

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '/',
      }),
    );

    assert.equal(document.activeElement, searchInputEl);
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createSearchField(),
      },
      {
        name: 'loading state',
        content: () => {
          fakeStore.isLoading.returns(true);
          return createSearchField();
        },
      },
    ]),
  );
});
