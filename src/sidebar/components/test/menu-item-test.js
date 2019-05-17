'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const MenuItem = require('../menu-item');

describe('MenuItem', () => {
  const createMenuItem = props =>
    shallow(<MenuItem label="Test item" {...props} />);

  it('invokes `onClick` callback when clicked', () => {
    const onClick = sinon.stub();
    const wrapper = createMenuItem({ onClick });
    wrapper.find('[role="menuitem"]').simulate('click');
    assert.called(onClick);
  });

  it('renders a link if an `href` is provided', () => {
    const wrapper = createMenuItem({ href: 'https://example.com' });
    const link = wrapper.find('a');
    assert.equal(link.length, 1);
    assert.equal(link.prop('href'), 'https://example.com');
    assert.equal(link.prop('rel'), 'noopener noreferrer');
  });

  it('renders a non-link if an `href` is not provided', () => {
    const wrapper = createMenuItem();
    assert.isFalse(wrapper.exists('a'));
    assert.equal(wrapper.find('.menu-item__label').text(), 'Test item');
  });

  it('renders an `<img>` icon if an icon URL is provided', () => {
    const src = 'https://example.com/icon.svg';
    const wrapper = createMenuItem({ icon: src });
    const icon = wrapper.find('img');
    assert.equal(icon.prop('src'), src);
  });

  it('renders an SVG icon if an icon name is provided', () => {
    const wrapper = createMenuItem({ icon: 'an-svg-icon' });
    assert.isTrue(wrapper.exists('SvgIcon[name="an-svg-icon"]'));
  });

  it('shows the submenu indicator if `isSubmenuVisible` is a boolean', () => {
    const wrapper = createMenuItem({ isSubmenuVisible: true });
    assert.isTrue(wrapper.exists('SvgIcon[name="collapse-menu"]'));

    wrapper.setProps({ isSubmenuVisible: false });
    assert.isTrue(wrapper.exists('SvgIcon[name="expand-menu"]'));
  });

  it('does not show submenu indicator if `isSubmenuVisible` is undefined', () => {
    const wrapper = createMenuItem();
    assert.isFalse(wrapper.exists('SvgIcon'));
  });

  it('calls the `onToggleSubmenu` callback when the submenu toggle is clicked', () => {
    const onToggleSubmenu = sinon.stub();
    const wrapper = createMenuItem({ isSubmenuVisible: true, onToggleSubmenu });
    wrapper.find('.menu-item__toggle').simulate('click');
    assert.called(onToggleSubmenu);
  });
});
