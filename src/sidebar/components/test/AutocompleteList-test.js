import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import AutocompleteList, { $imports } from '../AutocompleteList';

describe('AutocompleteList', () => {
  let fakeList;
  let fakeOnSelectItem;
  let fakeListFormatter;
  function createComponent(props) {
    return mount(
      <AutocompleteList
        list={fakeList}
        onSelectItem={fakeOnSelectItem}
        {...props}
      />
    );
  }

  beforeEach(() => {
    fakeList = ['tag1', 'tag2'];
    fakeOnSelectItem = sinon.stub();
    fakeListFormatter = sinon.stub();
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('hides the list container when `open` is false', () => {
    // `open` prop defaults to `false`
    const wrapper = createComponent();
    const container = wrapper.find(
      '[data-testid="autocomplete-list-container"]'
    );
    assert.isTrue(container.getDOMNode().classList.contains('hidden'));
  });

  it('hides the list container when `list` is empty', () => {
    const wrapper = createComponent({ open: true, list: [] });
    const container = wrapper.find(
      '[data-testid="autocomplete-list-container"]'
    );
    assert.isTrue(container.getDOMNode().classList.contains('hidden'));
  });

  it('renders the items in order of the list prop', () => {
    const wrapper = createComponent({ open: true });
    assert.equal(wrapper.find('li').at(0).text(), 'tag1');
    assert.equal(wrapper.find('li').at(1).text(), 'tag2');
  });

  it('sets `aria-selected` on the <li> at the matching index to `activeItem`', () => {
    const wrapper = createComponent({ open: true, activeItem: 0 });
    assert.equal(wrapper.find('li').at(0).prop('aria-selected'), true);
    assert.equal(wrapper.find('li').at(1).prop('aria-selected'), false);
  });

  it('calls `onSelect` when an <li> is clicked with the corresponding item', () => {
    const wrapper = createComponent({ open: true, activeItem: 0 });
    wrapper.find('li').at(0).simulate('click');
    assert.calledWith(fakeOnSelectItem, 'tag1');
  });

  it('calls `listFormatter` when building the <li> items if present', () => {
    createComponent({ open: true, listFormatter: fakeListFormatter });
    assert.calledWith(fakeListFormatter, 'tag1', 0);
    assert.calledWith(fakeListFormatter, 'tag2', 1);
  });

  it('adds the `id` attribute to <ul> only if its present', () => {
    let wrapper = createComponent({ open: true });
    assert.isNotOk(wrapper.find('ul').prop('id'));
    wrapper = createComponent({ open: true, id: 'AutocompleteList-id' });
    assert.equal(wrapper.find('ul').prop('id'), 'AutocompleteList-id');
  });

  it('creates unique ids on the <li> tags with the `itemPrefixId` only if its present', () => {
    let wrapper = createComponent({ open: true });
    assert.isNotOk(wrapper.find('li').at(0).prop('id'));
    wrapper = createComponent({ open: true, itemPrefixId: 'item-prefix-id-' });
    assert.equal(wrapper.find('li').at(0).prop('id'), 'item-prefix-id-0');
    assert.equal(wrapper.find('li').at(1).prop('id'), 'item-prefix-id-1');
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        name: 'list open',
        content: () => {
          return createComponent({ open: true });
        },
      },
      {
        name: 'list open, first item selected',
        content: () => {
          return createComponent({ open: true, activeItem: 1 });
        },
      },
    ])
  );
});
