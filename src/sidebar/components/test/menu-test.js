'use strict';

const { createElement } = require('preact');
const { act } = require('preact/test-utils');
const { mount } = require('enzyme');

const Menu = require('../menu');

describe('Menu', () => {
  let container;

  const TestLabel = () => 'Test label';
  const TestMenuItem = () => 'Test item';

  const createMenu = props => {
    // Use `mount` rather than `shallow` rendering in order to supporting
    // testing of clicking outside the element.
    return mount(
      <Menu {...props} label={<TestLabel />} title="Test menu">
        <TestMenuItem />
      </Menu>,
      { attachTo: container }
    );
  };

  function isOpen(wrapper) {
    return wrapper.exists('.menu__content');
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    Menu.$imports.$mock({
      // eslint-disable-next-line react/display-name
      './svg-icon': () => <span>Fake SVG icon</span>,
    });
  });

  afterEach(() => {
    Menu.$imports.$restore();
    container.remove();
  });

  it('opens and closes when the toggle button is clicked', () => {
    const wrapper = createMenu();
    assert.isFalse(isOpen(wrapper));
    wrapper.find('button').simulate('click');
    assert.isTrue(isOpen(wrapper));
    wrapper.find('button').simulate('click');
    assert.isFalse(isOpen(wrapper));
  });

  it('opens and closes when the toggle button is pressed', () => {
    const wrapper = createMenu();
    assert.isFalse(isOpen(wrapper));

    wrapper.find('button').simulate('mousedown');
    // Make sure the follow-up click doesn't close the menu.
    wrapper.find('button').simulate('click');

    assert.isTrue(isOpen(wrapper));
  });

  it('renders the label', () => {
    const wrapper = createMenu();
    assert.isTrue(wrapper.exists(TestLabel));
  });

  it('renders menu items when open', () => {
    const wrapper = createMenu({ defaultOpen: true });
    assert.isTrue(wrapper.exists(TestMenuItem));
  });

  let e;
  [
    new Event('mousedown'),
    new Event('click'),
    ((e = new Event('keypress')), (e.key = 'Escape'), e),
  ].forEach(event => {
    it('closes when the user clicks or presses the mouse outside', () => {
      const wrapper = createMenu();

      act(() => {
        document.body.dispatchEvent(event);
      });

      assert.isFalse(isOpen(wrapper));
    });
  });

  it('does not close menu if user presses mouse on menu content', () => {
    const wrapper = createMenu({ defaultOpen: true });
    let content = wrapper.find('.menu__content');
    act(() => {
      content
        .getDOMNode()
        .dispatchEvent(new Event('mousedown', { bubbles: true }));
      wrapper.update();
      content = wrapper.find('.menu__content');
    });
    assert.isTrue(isOpen(wrapper));
  });
});
