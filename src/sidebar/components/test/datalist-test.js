const { createElement } = require('preact');
const { mount } = require('enzyme');

const mockImportedComponents = require('./mock-imported-components');
const Datalist = require('../datalist');
const { $imports } = require('../datalist');

describe('TagEditor', function() {
  let fakeList;
  let fakeOnSelectItem;
  let fakeListFormatter;
  function createComponent(props) {
    return mount(
      <Datalist
        // props
        list={fakeList}
        open={true}
        onSelectItem={fakeOnSelectItem}
        {...props}
      />
    );
  }

  beforeEach(function() {
    fakeList = ['tag1', 'tag2'];
    fakeOnSelectItem = sinon.stub();
    fakeListFormatter = sinon.stub();
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('does not render the list when open is false', () => {
    const wrapper = createComponent({ open: false });
    assert.isFalse(wrapper.find('.datalist__items').exists());
  });

  it('does not render the list when list is empty', () => {
    const wrapper = createComponent({ list: [] });
    assert.isFalse(wrapper.find('.datalist__items').exists());
  });

  it('sets uniques keys to the <li> items', () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper
        .find('li')
        .at(0)
        .key(),
      'datalist-0'
    );
    assert.equal(
      wrapper
        .find('li')
        .at(1)
        .key(),
      'datalist-1'
    );
  });

  it('renders the items in order of the list prop', () => {
    const wrapper = createComponent();
    assert.equal(
      wrapper
        .find('li')
        .at(0)
        .text(),
      'tag1'
    );
    assert.equal(
      wrapper
        .find('li')
        .at(1)
        .text(),
      'tag2'
    );
  });

  it('does not apply the `is-selected` class to items that are not selected', () => {
    const wrapper = createComponent();
    assert.isFalse(wrapper.find('li.is-selected').exists());
  });

  it('applies `is-selected` class only to the <li> at the matching index', () => {
    const wrapper = createComponent({ activeItem: 0 });
    assert.isTrue(
      wrapper
        .find('li')
        .at(0)
        .hasClass('is-selected')
    );
    assert.isFalse(
      wrapper
        .find('li')
        .at(1)
        .hasClass('is-selected')
    );
  });

  it('calls onSelect when an <li> is clicked with the corresponding item', () => {
    const wrapper = createComponent({ activeItem: 0 });
    wrapper
      .find('li')
      .at(0)
      .simulate('click');
    assert.calledWith(fakeOnSelectItem, 'tag1');
  });

  it('calls listFormatter when building the <li> items if present', () => {
    createComponent({ listFormatter: fakeListFormatter });
    assert.calledWith(fakeListFormatter, 'tag1', 0);
    assert.calledWith(fakeListFormatter, 'tag2', 1);
  });
});
