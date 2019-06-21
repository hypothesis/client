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

  it('calls `onOpenChanged` prop when menu is opened or closed', () => {
    const onOpenChanged = sinon.stub();
    const wrapper = createMenu({ onOpenChanged });
    wrapper.find('button').simulate('click');
    assert.calledWith(onOpenChanged, true);
    wrapper.find('button').simulate('click');
    assert.calledWith(onOpenChanged, false);
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

  it('flips toggle arrow when open', () => {
    const wrapper = createMenu({ defaultOpen: true });
    const toggle = wrapper.find('.menu__toggle-arrow');
    assert.isTrue(toggle.hasClass('is-open'));
  });

  let e;
  [
    new Event('mousedown'),
    new Event('click'),
    ((e = new Event('keypress')), (e.key = 'Escape'), e),
    new Event('focus'),
  ].forEach(event => {
    it(`closes when the user clicks or presses the mouse outside (${event.type})`, () => {
      const wrapper = createMenu({ defaultOpen: true });

      act(() => {
        document.body.dispatchEvent(event);
      });
      wrapper.update();

      assert.isFalse(isOpen(wrapper));
    });
  });

  it('does not close when user presses non-Escape key outside', () => {
    const wrapper = createMenu({ defaultOpen: true });

    act(() => {
      const event = new Event('keypress');
      event.key = 'a';
      document.body.dispatchEvent(event);
    });
    wrapper.update();

    assert.isTrue(isOpen(wrapper));
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

  [
    {
      eventType: 'click',
      key: null,
      shouldClose: true,
    },
    {
      eventType: 'keypress',
      key: 'Enter',
      shouldClose: true,
    },
    {
      eventType: 'keypress',
      key: ' ',
      shouldClose: true,
    },
    {
      eventType: 'keypress',
      key: 'a',
      shouldClose: false,
    },
    {
      eventType: 'focus',
      key: null,
      shouldClose: false,
    },
  ].forEach(({ eventType, key, shouldClose }) => {
    it(`${
      shouldClose ? 'closes' : "doesn't close"
    } when user performs a "${eventType}" (key: "${key}") on menu content`, () => {
      const wrapper = createMenu({ defaultOpen: true });
      wrapper.find('.menu__content').simulate(eventType, { key });
      assert.equal(isOpen(wrapper), !shouldClose);
    });
  });

  it("doesn't close when user presses on a menu element outside the toggle button or content", () => {
    const wrapper = createMenu({ defaultOpen: true });

    // The event may be received either by the top `<div>` or the arrow element
    // itself.
    wrapper.find('.menu').simulate('mousedown');
    wrapper.find('.menu__arrow').simulate('mousedown');
  });

  it('aligns menu content depending on `align` prop', () => {
    const wrapper = createMenu({ defaultOpen: true });
    assert.isTrue(wrapper.exists('.menu__content--align-left'));

    wrapper.setProps({ align: 'left' });
    assert.isTrue(wrapper.exists('.menu__content--align-left'));

    wrapper.setProps({ align: 'right' });
    assert.isTrue(wrapper.exists('.menu__content--align-right'));
  });

  it('applies custom content class', () => {
    const wrapper = createMenu({
      defaultOpen: true,
      contentClass: 'special-menu',
    });
    const content = wrapper.find('.menu__content');
    assert.isTrue(content.hasClass('special-menu'));
  });

  it('applies custom arrow class', () => {
    const wrapper = createMenu({
      arrowClass: 'my-arrow-class',
      defaultOpen: true,
    });
    const arrow = wrapper.find('.menu__arrow');

    assert.isTrue(arrow.hasClass('my-arrow-class'));
  });

  it('has relative positioning if `containerPositioned` is `true`', () => {
    const wrapper = createMenu({
      containerPositioned: true, // default
    });
    const menuContainer = wrapper.find('.menu');

    assert.include({ position: 'relative' }, menuContainer.prop('style'));
  });

  it('has static positioning if `containerPositioned` is `false`', () => {
    const wrapper = createMenu({
      containerPositioned: false,
    });
    const menuContainer = wrapper.find('.menu');

    assert.include({ position: 'static' }, menuContainer.prop('style'));
  });
});
