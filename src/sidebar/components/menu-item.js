'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const propTypes = require('prop-types');

const { onActivate } = require('../util/on-activate');

const Slider = require('./slider');
const SvgIcon = require('./svg-icon');

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
function MenuItem({
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

  return (
    // Wrapper element is a `<div>` rather than a `Fragment` to work around
    // limitations of Enzyme's shallow rendering.
    <div>
      <div
        aria-checked={isSelected}
        className={classnames('menu-item', {
          'menu-item--submenu': isSubmenuItem,
          'is-disabled': isDisabled,
          'is-expanded': isExpanded,
          'is-selected': isSelected,
        })}
        role="menuitem"
        {...(onClick && onActivate('menuitem', onClick))}
      >
        <div className="menu-item__action">
          {hasLeftIcon && (
            <div className="menu-item__icon-container">{leftIcon}</div>
          )}
          {href && (
            <a
              className={labelClass}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          )}
          {!href && <span className={labelClass}>{label}</span>}
          {hasRightIcon && (
            <div className="menu-item__icon-container">{rightIcon}</div>
          )}
        </div>
        {typeof isSubmenuVisible === 'boolean' && (
          <div
            className="menu-item__toggle"
            // We need to pass strings here rather than just the boolean attribute
            // because otherwise the attribute will be omitted entirely when
            // `isSubmenuVisible` is false.
            aria-expanded={isSubmenuVisible ? 'true' : 'false'}
            aria-label={`Show actions for ${label}`}
            {...onActivate('button', onToggleSubmenu)}
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
    </div>
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

module.exports = MenuItem;
