import { EditIcon } from '@hypothesis/frontend-shared';
import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import MenuItem, { $imports } from '../MenuItem';

describe('MenuItem', () => {
  let containers = [];
  const createMenuItem = props => {
    let newContainer = document.createElement('div');
    containers.push(newContainer);
    document.body.appendChild(newContainer);
    return mount(<MenuItem label="Test item" {...props} />, {
      attachTo: newContainer,
    });
  };

  const menuItemSelector = '[data-testid="menu-item"]';

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
    containers.forEach(container => {
      container.remove();
    });
    containers = [];
  });

  describe('link menu items', () => {
    it('renders a link if an `href` is provided', () => {
      const wrapper = createMenuItem({ href: 'https://example.com' });
      const link = wrapper.find('a');
      assert.equal(link.length, 1);
      assert.equal(link.prop('href'), 'https://example.com');
      assert.equal(link.prop('rel'), 'noopener noreferrer');
    });

    it('invokes `onClick` callback when pressing `Enter` or space', () => {
      const onClick = sinon.stub();
      const wrapper = createMenuItem({ href: 'https://example.com', onClick });
      wrapper.find(menuItemSelector).simulate('keydown', { key: 'Enter' });
      assert.called(onClick);
      wrapper.find(menuItemSelector).simulate('keydown', { key: ' ' });
      assert.calledTwice(onClick);
    });
  });

  describe('button menu items', () => {
    it('renders a non-link if an `href` is not provided', () => {
      const wrapper = createMenuItem();
      assert.isFalse(wrapper.exists('a'));
      assert.equal(wrapper.find(menuItemSelector).text(), 'Test item');
    });

    it('invokes `onClick` callback when clicked', () => {
      const onClick = sinon.stub();
      const wrapper = createMenuItem({ onClick });
      wrapper.find(menuItemSelector).simulate('click');
      assert.called(onClick);
    });

    it('invokes `onClick` callback when pressing `Enter` or space', () => {
      const onClick = sinon.stub();
      const wrapper = createMenuItem({ isSelected: true, onClick });
      wrapper.find(menuItemSelector).simulate('keydown', { key: 'Enter' });
      assert.called(onClick);
      wrapper.find(menuItemSelector).simulate('keydown', { key: ' ' });
      assert.calledTwice(onClick);
    });

    it('has proper aria attributes when `isSelected` is a boolean', () => {
      const wrapper = createMenuItem({ isSelected: true });
      assert.equal(
        wrapper.find(menuItemSelector).prop('role'),
        'menuitemradio'
      );
      assert.equal(wrapper.find(menuItemSelector).prop('aria-checked'), true);
      // aria-haspopup should be false without a submenu
      assert.equal(wrapper.find(menuItemSelector).prop('aria-haspopup'), false);
    });
  });

  describe('icons for top-level menu items', () => {
    it('renders an icon if an icon is provided', () => {
      const wrapper = createMenuItem({ icon: EditIcon });
      assert.isTrue(wrapper.exists('EditIcon'));
    });

    it('adds a left container if left content is provided', () => {
      const wrapper = createMenuItem({
        leftChannelContent: <span>Hi</span>,
        icon: EditIcon,
      });
      const leftChannel = wrapper.find('[data-testid="left-item-container"]');
      assert.equal(leftChannel.text(), 'Hi');
      assert.isFalse(
        wrapper.exists('EditIcon'),
        'Icon ignored if left channel content provided'
      );
    });

    it('does not add a left container if neither icon nor left content provided', () => {
      const wrapper = createMenuItem();
      assert.equal(
        wrapper.find('[data-testid="left-item-container"]').length,
        0
      );
    });

    it('renders an icon on the left if `icon` provided', () => {
      const wrapper = createMenuItem({ icon: EditIcon });
      const leftItem = wrapper.find('[data-testid="left-item-container"]');

      // There should be only one icon space, on the left.
      assert.equal(leftItem.length, 1);
      assert.equal(leftItem.at(0).children().length, 1);
    });
  });

  describe('submenu', () => {
    it('shows the submenu indicator if `isSubmenuVisible` is a boolean', () => {
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        submenu: <div role="menuitem">Submenu content</div>,
      });
      assert.isTrue(wrapper.exists('SubmenuToggle'));
      assert.equal(wrapper.find(menuItemSelector).prop('aria-expanded'), true);

      wrapper.setProps({ isSubmenuVisible: false });
      assert.isTrue(wrapper.exists('MenuExpandIcon'));
      assert.equal(wrapper.find(menuItemSelector).prop('aria-haspopup'), true);
      assert.equal(wrapper.find(menuItemSelector).prop('aria-expanded'), false);
      assert.isNotOk(wrapper.find(menuItemSelector).prop('aria-expanded'));
    });

    it('does not show submenu indicator if `isSubmenuVisible` is undefined', () => {
      const wrapper = createMenuItem();
      assert.isFalse(wrapper.exists('Icon'));
      // aria-expanded should be undefined
      assert.equal(
        wrapper.find(menuItemSelector).prop('aria-expanded'),
        undefined
      );
    });

    it('calls the `onToggleSubmenu` callback when the submenu toggle is clicked', () => {
      const fakeOnToggleSubmenu = sinon.stub();
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        onToggleSubmenu: fakeOnToggleSubmenu,
        submenu: <div role="menuitem">Submenu content</div>,
      });
      wrapper.find('[data-testid="submenu-toggle"]').simulate('click');
      assert.called(fakeOnToggleSubmenu);
    });

    it('calls the `onToggleSubmenu` callback when pressing arrow right', () => {
      const fakeOnToggleSubmenu = sinon.stub();
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        onToggleSubmenu: fakeOnToggleSubmenu,
        submenu: <div role="menuitem">Item</div>,
      });
      wrapper.find(menuItemSelector).simulate('keydown', { key: 'ArrowRight' });
      assert.called(fakeOnToggleSubmenu);
    });

    it('renders submenu item icons on the right', () => {
      const wrapper = createMenuItem({
        icon: EditIcon,
        isSubmenuItem: true,
        submenu: <div role="menuitem">Submenu content</div>,
      });
      const rightItem = wrapper.find('[data-testid="right-item-container"]');
      assert.isTrue(rightItem.find('EditIcon').exists());
    });

    it('does not render submenu content if `isSubmenuVisible` is undefined', () => {
      const wrapper = createMenuItem({});
      assert.isFalse(wrapper.exists('Slider'));
    });

    it('shows submenu content if `isSubmenuVisible` is true', () => {
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        submenu: <div role="menuitem">Submenu content</div>,
      });
      assert.equal(wrapper.find('Slider').prop('direction'), 'in');
      assert.equal(
        wrapper.find('MenuKeyboardNavigation').prop('visible'),
        true
      );
      assert.equal(wrapper.find('Slider').children().text(), 'Submenu content');
    });

    it('hides submenu content if `isSubmenuVisible` is false', () => {
      const wrapper = createMenuItem({
        isSubmenuVisible: false,
        submenu: <div>Submenu content</div>,
      });
      assert.equal(wrapper.find('Slider').prop('direction'), 'out');
      assert.equal(
        wrapper.find('MenuKeyboardNavigation').prop('visible'),
        false
      );

      // The submenu content may still be rendered if the submenu is currently
      // collapsing.
      assert.equal(wrapper.find('Slider').children().text(), 'Submenu content');
    });

    it('calls `onToggleSubmenu` when the `closeMenu` callback is fired', () => {
      const fakeOnToggleSubmenu = sinon.stub();
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        submenu: <div role="menuitem">Submenu content</div>,
        onToggleSubmenu: fakeOnToggleSubmenu,
      });
      act(() => {
        wrapper
          .find('MenuKeyboardNavigation')
          .props()
          .closeMenu({ key: 'Enter' });
      });
      assert.isTrue(fakeOnToggleSubmenu.called);
    });

    it('sets focus to the parent item when the submenu is closed via `closeMenu`', () => {
      const clock = sinon.useFakeTimers();
      try {
        const wrapper = createMenuItem({
          isSubmenuVisible: true,
          submenu: <div role="menuitem">Submenu content</div>,
        });
        act(() => {
          wrapper
            .find('MenuKeyboardNavigation')
            .props()
            .closeMenu({ key: 'Enter' });
        });
        clock.tick(1);
        assert.equal(
          document.activeElement.getAttribute('data-testid'),
          'menu-item'
        );
      } finally {
        clock.restore();
      }
    });

    it('does not throw an error when unmounting the component before the focus timeout finishes', () => {
      const clock = sinon.useFakeTimers();
      try {
        const wrapper = createMenuItem({
          isSubmenuVisible: true,
          submenu: <div role="menuitem">Submenu content</div>,
        });
        act(() => {
          wrapper
            .find('MenuKeyboardNavigation')
            .props()
            .closeMenu({ key: 'Enter' });
        });
        wrapper.unmount();
        clock.tick(1);
      } finally {
        clock.restore();
      }
      // no assert needed
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        // eslint-disable-next-line react/display-name
        content: () => (
          <div role="menu">
            <MenuItem label="Test item" />
          </div>
        ),
      },
      {
        name: 'menu radio button',
        // eslint-disable-next-line react/display-name
        content: () => (
          <div role="menu">
            <MenuItem label="Test" isSelected={false} />
          </div>
        ),
      },
      {
        name: 'with link',
        // eslint-disable-next-line react/display-name
        content: () => (
          <div role="menu">
            <MenuItem label="Test" href="https://foobar.com" />
          </div>
        ),
      },
      {
        name: 'with icon',
        // eslint-disable-next-line react/display-name
        content: () => (
          <div role="menu">
            <MenuItem label="Test" icon="edit" />
          </div>
        ),
      },
      {
        name: 'with submenu',
        // eslint-disable-next-line react/display-name
        content: () => (
          <div role="menu">
            <MenuItem
              label="Test"
              isSubmenuVisible={true}
              submenu={<div role="menuitem">Submenu content</div>}
            />
          </div>
        ),
      },
    ])
  );
});
