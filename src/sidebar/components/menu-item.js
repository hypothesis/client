import classnames from 'classnames';
import { Fragment, createElement } from 'preact';
import { useRef } from 'preact/hooks';
import propTypes from 'prop-types';

import Slider from './slider';
import SvgIcon from './svg-icon';

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
  const labelClass = classnames('menu-item__label', {
    'menu-item__label--submenu': isSubmenuItem,
  });

  const hasLeftIcon = icon || isSubmenuItem;
  const hasRightIcon = icon && isSubmenuItem;

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

  const handleClick = event => {
    if (onClick) {
      onClick(event);
    }
    if (href) {
      // TBD - Could we revert the menu item label to be a link as it was before
      // but with `tabIndex` set to `-1` and then just click the link here.
      window.open(href, '_blank');
    }
  };

  const handleKeyDown = event => {
    if (event.key === 'ArrowRight' && !isSubmenuVisible) {
      // TODO - This should focus the first item in the submenu, which should then
      // support the same keys (Up, Down, Home, End) for navigating between items
      // as when a top-level menu is focused.
      onToggleSubmenu(event);
    } else if (event.key === 'ArrowLeft' && isSubmenuVisible) {
      onToggleSubmenu(event);
    } else if (event.key === 'Enter' || event.key === ' ') {
      handleClick(event);
    }
  };

  const optionalAriaProps = {};
  let role = 'menuitem';

  if (typeof isSelected === 'boolean') {
    optionalAriaProps['aria-checked'] = isSelected;
    role = 'menuitemradio';
  }

  if (typeof isSubmenuVisible === 'boolean') {
    optionalAriaProps['aria-expanded'] = isSubmenuVisible;
  }

  return (
    <Fragment>
      <div
        arrow-key-focus={true}
        aria-haspopup={typeof isSubmenuVisible === 'boolean'}
        className={classnames('menu-item', {
          'menu-item--submenu': isSubmenuItem,
          'is-disabled': isDisabled,
          'is-expanded': isExpanded,
          'is-selected': isSelected,
        })}
        role={role}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        {...optionalAriaProps}
      >
        <div className="menu-item__action">
          {hasLeftIcon && (
            <div className="menu-item__icon-container">{leftIcon}</div>
          )}
          <span className={labelClass}>{label}</span>
          {hasRightIcon && (
            <div className="menu-item__icon-container">{rightIcon}</div>
          )}
        </div>
        {typeof isSubmenuVisible === 'boolean' && (
          // Activating this toggle via the keyboard is done by pressing the
          // right arrow key when the parent "menuitem" has keyboard focus.
          // This is the standard interaction pattern for opening a submenu
          // from a parent menu item.
          //
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
          <div
            className="menu-item__toggle"
            onClick={onToggleSubmenu}
            tabIndex={-1}
          >
            <SvgIcon
              name={isSubmenuVisible ? 'collapse-menu' : 'expand-menu'}
              className="menu-item__toggle-icon"
            />
          </div>
        )}
      </div>
      {typeof isSubmenuVisible === 'boolean' && (
        <Slider visible={isSubmenuVisible}>
          <div className="menu-item__submenu">{submenu}</div>
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
