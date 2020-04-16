import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import MenuItem from '../menu-item';
import { $imports } from '../menu-item';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('MenuItem', () => {
  const createMenuItem = props => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return mount(<MenuItem label="Test item" {...props} />, {
      attachTo: container,
    });
  };

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('link menu items', () => {
    it('renders a link if an `href` is provided', () => {
      const wrapper = createMenuItem({ href: 'https://example.com' });
      const link = wrapper.find('a');
      assert.equal(link.length, 1);
      assert.equal(link.prop('href'), 'https://example.com');
      assert.equal(link.prop('rel'), 'noopener noreferrer');
    });

    it('renders an `<img>` icon if an icon URL is provided', () => {
      const src = 'https://example.com/icon.svg';
      const wrapper = createMenuItem({ icon: src });
      const icon = wrapper.find('img');
      assert.equal(icon.prop('src'), src);
    });

    it('invokes `onClick` callback when pressing `Enter` or space', () => {
      const onClick = sinon.stub();
      const wrapper = createMenuItem({ href: 'https://example.com', onClick });
      wrapper.find('.menu-item').simulate('keydown', { key: 'Enter' });
      assert.called(onClick);
      wrapper.find('.menu-item').simulate('keydown', { key: ' ' });
      assert.calledTwice(onClick);
    });
  });

  describe('button menu items', () => {
    it('renders a non-link if an `href` is not provided', () => {
      const wrapper = createMenuItem();
      assert.isFalse(wrapper.exists('a'));
      assert.equal(wrapper.find('.menu-item__label').text(), 'Test item');
    });

    it('invokes `onClick` callback when clicked', () => {
      const onClick = sinon.stub();
      const wrapper = createMenuItem({ onClick });
      wrapper.find('.menu-item').simulate('click');
      assert.called(onClick);
    });

    it('has proper aria attributes when `isSelected` is a boolean', () => {
      const wrapper = createMenuItem({ isSelected: true });
      assert.equal(wrapper.find('.menu-item').prop('role'), 'menuitemradio');
      assert.equal(wrapper.find('.menu-item').prop('aria-checked'), true);
      // aria-haspopup should be false without a submenu
      assert.equal(wrapper.find('.menu-item').prop('aria-haspopup'), false);
    });

    it('invokes `onClick` callback when pressing `Enter` or space', () => {
      const onClick = sinon.stub();
      const wrapper = createMenuItem({ isSelected: true, onClick });
      wrapper.find('.menu-item').simulate('keydown', { key: 'Enter' });
      assert.called(onClick);
      wrapper.find('.menu-item').simulate('keydown', { key: ' ' });
      assert.calledTwice(onClick);
    });
  });

  describe('icons', () => {
    it('renders an SVG icon if an icon name is provided', () => {
      const wrapper = createMenuItem({ icon: 'an-svg-icon' });
      assert.isTrue(wrapper.exists('SvgIcon[name="an-svg-icon"]'));
    });

    it('renders a blank space for an icon if `icon` is "blank"', () => {
      const wrapper = createMenuItem({ icon: 'blank' });
      const iconSpace = wrapper.find('.menu-item__icon-container');
      assert.equal(iconSpace.length, 1);
      assert.equal(iconSpace.children().length, 0);
    });

    it('does not render a space for an icon if `icon` is missing', () => {
      const wrapper = createMenuItem();
      const iconSpace = wrapper.find('.menu-item__icon-container');
      assert.equal(iconSpace.length, 0);
    });

    it('renders top-level menu item icons on the left', () => {
      const wrapper = createMenuItem({ icon: 'an-svg-icon' });
      const iconSpaces = wrapper.find('.menu-item__icon-container');

      // There should be only one icon space, on the left.
      assert.equal(iconSpaces.length, 1);
      assert.equal(iconSpaces.at(0).children().length, 1);
    });
  });

  describe('submenu', () => {
    it('shows the submenu indicator if `isSubmenuVisible` is a boolean', () => {
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
      });
      assert.isTrue(wrapper.exists('SvgIcon[name="collapse-menu"]'));
      assert.equal(wrapper.find('.menu-item').prop('aria-expanded'), true);

      wrapper.setProps({ isSubmenuVisible: false });
      assert.isTrue(wrapper.exists('SvgIcon[name="expand-menu"]'));
      assert.equal(wrapper.find('.menu-item').prop('aria-haspopup'), true);
      assert.equal(wrapper.find('.menu-item').prop('aria-expanded'), false);
    });

    it('does not show submenu indicator if `isSubmenuVisible` is undefined', () => {
      const wrapper = createMenuItem();
      assert.isFalse(wrapper.exists('SvgIcon'));
      // aria-expanded should not be present
      assert.equal(wrapper.find('.menu-item').prop('aria-expanded'), undefined);
    });

    it('calls the `onToggleSubmenu` callback when the submenu toggle is clicked', () => {
      const fakeOnToggleSubmenu = sinon.stub();
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        onToggleSubmenu: fakeOnToggleSubmenu,
      });
      wrapper.find('.menu-item__toggle').simulate('click');
      assert.called(fakeOnToggleSubmenu);
    });

    it('calls the `onToggleSubmenu` callback when pressing arrow right', () => {
      const fakeOnToggleSubmenu = sinon.stub();
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        onToggleSubmenu: fakeOnToggleSubmenu,
      });
      wrapper.find('.menu-item').simulate('keydown', { key: 'ArrowRight' });
      assert.called(fakeOnToggleSubmenu);
    });

    it('renders submenu item icons on the right', () => {
      const wrapper = createMenuItem({
        icon: 'an-svg-icon',
        isSubmenuItem: true,
      });
      const iconSpaces = wrapper.find('.menu-item__icon-container');
      assert.equal(iconSpaces.length, 2);

      // There should be a space for the parent item's icon.
      assert.equal(iconSpaces.at(0).children().length, 0);

      // The actual icon for the submenu should be shown on the right.
      assert.equal(iconSpaces.at(1).children().length, 1);
    });

    it('does not render submenu content if `isSubmenuVisible` is undefined', () => {
      const wrapper = createMenuItem({});
      assert.isFalse(wrapper.exists('Slider'));
    });

    it('shows submenu content if `isSubmenuVisible` is true', () => {
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        submenu: <div>Submenu content</div>,
      });
      assert.equal(wrapper.find('Slider').prop('visible'), true);
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
      assert.equal(wrapper.find('Slider').prop('visible'), false);
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
        submenu: <div>Submenu content</div>,
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
      const wrapper = createMenuItem({
        isSubmenuVisible: true,
        submenu: <div>Submenu content</div>,
      });
      act(() => {
        wrapper
          .find('MenuKeyboardNavigation')
          .props()
          .closeMenu({ key: 'Enter' });
      });
      clock.tick(1);
      assert.equal(document.activeElement.className, 'menu-item');
      clock.restore();
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
            <MenuItem label="Test" icon="an-svg-icon" />
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
              submenu={<div>Submenu content</div>}
            />
          </div>
        ),
      },
    ])
  );
});
