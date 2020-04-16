import classnames from 'classnames';
import { Fragment, createElement } from 'preact';
import { useRef } from 'preact/hooks';
import propTypes from 'prop-types';

import MenuKeyboardNavigation from './menu-keyboard-navigation';
import Slider from './slider';
import SvgIcon from '../../shared/components/svg-icon';

/**
 * An item in a dropdown menu.
 *
 * Dropdown menu items display an icon, a label and can optionally have a submenu
 * associated with them.
 *
 * When clicked, menu items either open an external link, if the `href` prop
 * is provided, or perform a custom action via the `onClick` callback.
 *
 * The icon can either be an external SVG image, referenced by URL, or a named
 * icon rendered by an `SvgIcon`.
 *
 * For items that have submenus, the `MenuItem` will call the `renderSubmenu`
 * prop to render the content of the submenu, when the submenu is visible.
 * Note that the `submenu` is not supported for link (`href`) items.
 */
export default function MenuItem({
  href,
  icon,
  iconAlt,
  isDisabled,
  isExpanded,
  isSelected,
  isSubmenuItem,
  isSubmenuVisible,
  label,
  onClick,
  onToggleSubmenu,
  submenu,
}) {
  const iconClass = 'menu-item__icon';
  const iconIsUrl = icon && icon.indexOf('/') !== -1;

  const hasLeftIcon = icon || isSubmenuItem;
  const hasRightIcon = icon && isSubmenuItem;

  const menuItemRef = useRef(null);

  let renderedIcon = null;
  if (icon !== 'blank') {
    renderedIcon = iconIsUrl ? (
      <img className={iconClass} alt={iconAlt} src={icon} />
    ) : (
      <SvgIcon name={icon} className="menu-item__icon" />
    );
  }
  const leftIcon = isSubmenuItem ? null : renderedIcon;
  const rightIcon = isSubmenuItem ? renderedIcon : null;

  // menuItem can be either a link or a button
  let menuItem;
  const hasSubmenuVisible = typeof isSubmenuVisible === 'boolean';
  const isRadioButtonType = typeof isSelected === 'boolean';

  const onCloseSubmenu = event => {
    if (onToggleSubmenu) {
      onToggleSubmenu(event);
    }
    // The focus won't work without delaying rendering.
    setTimeout(() => {
      menuItemRef.current.focus();
    });
  };

  const onKeyDown = event => {
    switch (event.key) {
      case 'ArrowRight':
        if (onToggleSubmenu) {
          event.stopPropagation();
          event.preventDefault();
          onToggleSubmenu(event);
        }
        break;
      case 'Enter':
      case ' ':
        if (onClick) {
          // Let event propagate so the menu closes
          onClick(event);
        }
    }
  };
  if (href) {
    // The menu item is a link
    menuItem = (
      <a
        ref={menuItemRef}
        className={classnames('menu-item', {
          'is-submenu': isSubmenuItem,
          'is-disabled': isDisabled,
        })}
        href={href}
        target="_blank"
        tabIndex="-1"
        rel="noopener noreferrer"
        role="menuitem"
        onKeyDown={onKeyDown}
      >
        {hasLeftIcon && (
          <div className="menu-item__icon-container">{leftIcon}</div>
        )}
        <span className="menu-item__label">{label}</span>
        {hasRightIcon && (
          <div className="menu-item__icon-container">{rightIcon}</div>
        )}
      </a>
    );
  } else {
    // The menu item is a clickable button or radio button.
    // In either case there may be an optional submenu.

    const expandedProp = {
      'aria-expanded': hasSubmenuVisible ? isSubmenuVisible : undefined,
    };
    menuItem = (
      <div
        ref={menuItemRef}
        className={classnames('menu-item', {
          'is-submenu': isSubmenuItem,
          'is-disabled': isDisabled,
          'is-expanded': isExpanded,
          'is-selected': isSelected,
        })}
        tabIndex="-1"
        onKeyDown={onKeyDown}
        onClick={onClick}
        role={isRadioButtonType ? 'menuitemradio' : 'menuitem'}
        aria-checked={isRadioButtonType ? isSelected : undefined}
        aria-haspopup={hasSubmenuVisible}
        {...expandedProp}
      >
        {hasLeftIcon && (
          <div className="menu-item__icon-container">{leftIcon}</div>
        )}
        <span className="menu-item__label">{label}</span>
        {hasRightIcon && (
          <div className="menu-item__icon-container">{rightIcon}</div>
        )}

        {hasSubmenuVisible && (
          <div
            role="none"
            icon={isSubmenuVisible ? 'collapse-menu' : 'expand-menu'}
            className="menu-item__toggle"
            onClick={onToggleSubmenu}
            title={`Show actions for ${label}`}
          >
            <SvgIcon
              name={isSubmenuVisible ? 'collapse-menu' : 'expand-menu'}
              className="menu-item__toggle-icon"
            />
          </div>
        )}
      </div>
    );
  }
  return (
    <Fragment>
      {menuItem}
      {hasSubmenuVisible && (
        <Slider visible={isSubmenuVisible}>
          <MenuKeyboardNavigation
            closeMenu={onCloseSubmenu}
            visible={isSubmenuVisible}
            className="menu-item__submenu"
          >
            {submenu}
          </MenuKeyboardNavigation>
        </Slider>
      )}
    </Fragment>
  );
}

MenuItem.propTypes = {
  /**
   * URL of the external link to open when this item is clicked.
   * Either the `href` or an  `onClick` callback should be supplied.
   */
  href: propTypes.string,

  /** Alt text for icon. */
  iconAlt: propTypes.string,

  /**
   * Name or URL of icon to display. If the value is a URL it is displayed
   * using an `<img>`, if it is a name it is displayed using `SvgIcon`.
   *
   * If the property is `"blank"` a blank placeholder is displayed in place of an
   * icon. If the property is falsey, no placeholder is displayed.
   * The placeholder is useful to keep menu item labels aligned in a list if
   * some items have icons and others do not.
   */
  icon: propTypes.string,

  /**
   * Dim the label to indicate that this item is not currently available.
   *
   * The `onClick` callback will still be invoked when this item is clicked and
   * the submenu, if any, can still be toggled.
   */
  isDisabled: propTypes.bool,

  /**
   * Indicates that the submenu associated with this item is currently open.
   */
  isExpanded: propTypes.bool,

  /**
   * Display an indicator to show that this menu item represents something
   * which is currently selected/active/focused.
   */
  isSelected: propTypes.bool,

  /**
   * True if this item is part of a submenu, in which case it is rendered
   * with a different style (shaded background)
   */
  isSubmenuItem: propTypes.bool,

  /**
   * If present, display a button to toggle the sub-menu associated with this
   * item and indicate the current state; `true` if the submenu is visible.
   * Note. Omit this prop, or set it to null, if there is no `submenu`.
   */
  isSubmenuVisible: propTypes.bool,

  /** Label of the menu item. */
  label: propTypes.string.isRequired,

  /** Callback to invoke when the menu item is clicked. */
  onClick: propTypes.func,

  /**
   * Callback when the user clicks on the toggle to change the expanded
   * state of the menu.
   */
  onToggleSubmenu: propTypes.func,

  /**
   * Contents of the submenu for this item.
   *
   * This is typically a list of `MenuItem` components with the `isSubmenuItem`
   * prop set to `true`, but can include other content as well.
   * The submenu is only rendered if `isSubmenuVisible` is `true`.
   */
  submenu: propTypes.any,
};
