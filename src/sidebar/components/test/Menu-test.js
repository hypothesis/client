import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import Menu from '../Menu';
import { $imports } from '../Menu';

describe('Menu', () => {
  let container;

  const menuSelector = '[data-testid="menu-container"]';
  const contentSelector = '[data-testid="menu-content"]';
  const toggleSelector = 'button[data-testid="menu-toggle-button"]';

  const TestLabel = () => 'Test label';
  const TestMenuItem = () => 'Test item';

  const createMenu = props => {
    // Use `mount` rather than `shallow` rendering in order to supporting
    // testing of clicking outside the element.
    return mount(
      <Menu {...props} label={<TestLabel />} title="Test menu">
        <TestMenuItem />
      </Menu>,
      { attachTo: container },
    );
  };

  function isOpen(wrapper) {
    return wrapper.exists(contentSelector);
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
    container.remove();
  });

  it('opens and closes when the toggle button is clicked', () => {
    const wrapper = createMenu();
    assert.isFalse(isOpen(wrapper));
    wrapper.find(toggleSelector).simulate('click');
    assert.isTrue(isOpen(wrapper));
    wrapper.find(toggleSelector).simulate('click');
    assert.isFalse(isOpen(wrapper));
  });

  it('disables menu if `disabled` prop is true', () => {
    const wrapper = createMenu({ disabled: true });
    const toggle = wrapper.find(toggleSelector);
    assert.isTrue(toggle.prop('disabled'));
  });

  it('leaves the management of open/closed state to parent component if `open` prop present', () => {
    // When `open` is present, `Menu` will invoke `onOpenChanged` on interactions
    // but will not modify the its open state directly.
    const wrapper = createMenu({ open: true });

    assert.isTrue(isOpen(wrapper));

    wrapper.find(toggleSelector).simulate('click');
    assert.isTrue(isOpen(wrapper));
  });

  it('calls `onOpenChanged` prop when menu is opened or closed', () => {
    const onOpenChanged = sinon.stub();
    const wrapper = createMenu({ onOpenChanged });
    wrapper.find(toggleSelector).simulate('click');
    assert.calledWith(onOpenChanged, true);
    wrapper.find(toggleSelector).simulate('click');
    assert.calledWith(onOpenChanged, false);
  });

  it('opens and closes when the toggle button is pressed', () => {
    const wrapper = createMenu();
    assert.isFalse(isOpen(wrapper));

    wrapper.find(toggleSelector).simulate('mousedown');
    // Make sure the follow-up click doesn't close the menu.
    wrapper.find(toggleSelector).simulate('click');

    assert.isTrue(isOpen(wrapper));
  });

  it('gives precedence to `open` over `defaultOpen`', () => {
    const wrapper = createMenu({ open: true, defaultOpen: false });

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
    ((e = new Event('keydown')), (e.key = 'Escape'), e),
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
      const event = new Event('keydown');
      event.key = 'a';
      document.body.dispatchEvent(event);
    });
    wrapper.update();

    assert.isTrue(isOpen(wrapper));
  });

  it('does not close menu if user presses mouse on menu content', () => {
    const wrapper = createMenu({ defaultOpen: true });
    let content = wrapper.find(contentSelector);
    act(() => {
      content
        .getDOMNode()
        .dispatchEvent(new Event('mousedown', { bubbles: true }));
      wrapper.update();
      content = wrapper.find(contentSelector);
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
      eventType: 'keydown',
      key: 'Enter',
      shouldClose: true,
    },
    {
      eventType: 'keydown',
      key: ' ',
      shouldClose: true,
    },
    {
      eventType: 'keydown',
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
      const clock = sinon.useFakeTimers();
      try {
        const wrapper = createMenu({ defaultOpen: true });
        wrapper.find(contentSelector).simulate(eventType, { key });
        // The close event is delayed by a minimal amount of time in
        // order to allow links to say in the DOM long enough to be
        // followed on a click. Therefore, this test must simulate
        // time passing in order for the menu to close.
        clock.tick(1);
        wrapper.update();
        assert.equal(isOpen(wrapper), !shouldClose);
      } finally {
        clock.restore();
      }
    });
  });

  it("doesn't close when user presses on a menu element outside the toggle button or content", () => {
    const wrapper = createMenu({ defaultOpen: true });

    // The event may be received either by the top `<div>` or the arrow element
    // itself.
    wrapper.find(menuSelector).simulate('mousedown');

    assert.isTrue(isOpen(wrapper));
  });

  it('aligns menu content depending on `align` prop', () => {
    const wrapper = createMenu({ defaultOpen: true });
    assert.isTrue(wrapper.find(contentSelector).hasClass('left-0'));

    wrapper.setProps({ align: 'left' });
    assert.isTrue(wrapper.find(contentSelector).hasClass('left-0'));

    wrapper.setProps({ align: 'right' });
    assert.isTrue(wrapper.find(contentSelector).hasClass('right-0'));
  });

  it('applies custom content class', () => {
    const wrapper = createMenu({
      defaultOpen: true,
      contentClass: 'special-menu',
    });
    const content = wrapper.find(contentSelector);
    assert.isTrue(content.hasClass('special-menu'));
  });

  it('applies custom arrow class', () => {
    const wrapper = createMenu({
      arrowClass: 'my-arrow-class',
      defaultOpen: true,
    });
    const arrow = wrapper.find('MenuArrow');

    assert.include(arrow.props().classes, 'my-arrow-class');
  });

  it('has relative positioning if `containerPositioned` is `true`', () => {
    const wrapper = createMenu({
      containerPositioned: true, // default
    });
    const menuContainer = wrapper.find(menuSelector);

    assert.include({ position: 'relative' }, menuContainer.prop('style'));
  });

  it('has static positioning if `containerPositioned` is `false`', () => {
    const wrapper = createMenu({
      containerPositioned: false,
    });
    const menuContainer = wrapper.find(menuSelector);

    assert.include({ position: 'static' }, menuContainer.prop('style'));
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        // eslint-disable-next-line react/display-name
        content: () => (
          <Menu label={<TestLabel />} title="Test menu">
            <TestMenuItem />
          </Menu>
        ),
      },
    ]),
  );
});
