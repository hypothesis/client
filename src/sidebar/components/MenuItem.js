import classnames from 'classnames';
import { Icon, normalizeKeyName } from '@hypothesis/frontend-shared';
import { useEffect, useRef } from 'preact/hooks';

import MenuKeyboardNavigation from './MenuKeyboardNavigation';
import Slider from './Slider';

/**
 * @typedef {import('../icons').sidebarIcons} SidebarIcons
 */

/**
 * Render a clickable div that will toggle the expanded state of the
 * associated submenu via `onToggleSubmenu`.
 *
 * @param {object} props
 *   @param {string} props.title
 *   @param {boolean} props.isExpanded
 *   @param {(e: Event) => void} [props.onToggleSubmenu]
 */
function SubmenuToggle({ title, isExpanded, onToggleSubmenu }) {
  return (
    <div
      data-testid="submenu-toggle"
      // We should not have a <button> inside of the menu item itself
      // but we have a non-standard mechanism with the toggle control
      // requiring an onClick event nested inside a "menuitemradio|menuitem".
      // Therefore, a static element with a role="none" is necessary here.
      role="none"
      className={classnames(
        // Center content in a 40px square. The entire element is clickable
        'flex flex-col items-center justify-center w-10 h-10',
        'text-grey-6 bg-grey-1',
        // Clip the background (color) such that it only shows within the
        // content box, which is a 24px rounded square formed by the large
        // borders
        'bg-clip-content border-[8px] border-transparent rounded-xl',
        // When the menu item is hovered AND this element is hovered, darken
        // the text color so it is clear that the toggle is the hovered element
        'group-hover:hover:text-grey-8',
        {
          // When the submenu is expanded, this element always has a darker
          // background color regardless of hover state.
          'bg-grey-4': isExpanded,
          // When the parent menu item is hovered, it gets a darker background.
          // Make the toggle background darker also.
          'group-hover:bg-grey-3': !isExpanded,
        }
      )}
      onClick={onToggleSubmenu}
      title={title}
    >
      <Icon
        name={isExpanded ? 'collapse-menu' : 'expand-menu'}
        classes="w-3 h-3"
      />
    </div>
  );
}

/**
 * @typedef MenuItemProps
 * @prop {string} [href] -
 *   URL of the external link to open when this item is clicked. Either the `href` or an
 *   `onClick` callback should be supplied.
 * @prop {string} [iconAlt] - Alt text for icon.
 * @prop {string} [icon] -
 *   Name or URL of icon to display. If the value is a URL it is displayed using an `<img>`;
 *   if it is a non-URL string it is assumed to be the `name` of a registered icon.
 *   If the property is `"blank"` a blank placeholder is displayed in place of an icon.
 *   The placeholder is useful to keep menu item labels aligned.
 * @prop {boolean} [isDisabled] -
 *   Dim the label to indicate that this item is not currently available.  The `onClick`
 *   callback will still be invoked when this item is clicked and the submenu, if any,
 *   can still be toggled.
 * @prop {boolean} [isExpanded] -
 *   Indicates that the submenu associated with this item is currently open.
 * @prop {boolean} [isSelected] -
 *   Display an indicator to show that this menu item represents something which is currently
 *   selected/active/focused.
 * @prop {boolean} [isSubmenuItem] -
 *   True if this item is part of a submenu, in which case it is rendered with a different
 *   style (shaded background)
 * @prop {boolean|undefined} [isSubmenuVisible] -
 *   If present, display a button to toggle the sub-menu associated with this item and
 *   indicate the current state; `true` if the submenu is visible. Note. Omit this prop,
 *    or set it to null, if there is no `submenu`.
 * @prop {string} label - Label of the menu item.
 * @prop {(e: Event) => void} [onClick] - Callback to invoke when the menu item is clicked.
 * @prop {(e: Event) => void} [onToggleSubmenu] -
 *   Callback when the user clicks on the toggle to change the expanded state of the menu.
 * @prop {object} [submenu] -
 *   Contents of the submenu for this item.  This is typically a list of `MenuItem` components
 *    with the `isSubmenuItem` prop set to `true`, but can include other content as well.
 *    The submenu is only rendered if `isSubmenuVisible` is `true`.
 */

/**
 * An item in a dropdown menu.
 *
 * Dropdown menu items display an icon, a label and can optionally have a submenu
 * associated with them.
 *
 * When clicked, menu items either open an external link, if the `href` prop
 * is provided, or perform a custom action via the `onClick` callback.
 *
 * The icon can either be an external SVG image, referenced by URL, or the
 * name of an icon registered in the application. @see {SidebarIcons}
 *
 * For items that have submenus, the `MenuItem` will call the `renderSubmenu`
 * prop to render the content of the submenu, when the submenu is visible.
 * Note that the `submenu` is not supported for link (`href`) items.
 *
 * @param {MenuItemProps} props
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
  const iconIsUrl = icon && icon.indexOf('/') !== -1;

  const menuItemRef =
    /** @type {{ current: HTMLAnchorElement & HTMLDivElement }} */ (useRef());

  /** @type {number|undefined} */
  let focusTimer;

  // menuItem can be either a link or a button
  let menuItem;
  const hasSubmenuVisible = typeof isSubmenuVisible === 'boolean';
  const isRadioButtonType = typeof isSelected === 'boolean';

  useEffect(() => {
    return () => {
      // unmount
      clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** @param {Event} event */
  const onCloseSubmenu = event => {
    if (onToggleSubmenu) {
      onToggleSubmenu(event);
    }
    // The focus won't work without delaying rendering.
    focusTimer = setTimeout(() => {
      menuItemRef.current.focus();
    });
  };

  /** @param {KeyboardEvent} event */
  const onKeyDown = event => {
    switch (normalizeKeyName(event.key)) {
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

  let renderedIcon = null;
  if (icon && icon !== 'blank') {
    renderedIcon = iconIsUrl ? (
      <img className="w-4 h-4" alt={iconAlt} src={icon} />
    ) : (
      <Icon name={icon} classes="h-3 w-3" />
    );
  }
  const leftIcon = isSubmenuItem ? null : renderedIcon;
  const rightIcon = isSubmenuItem ? renderedIcon : null;

  // MenuItem content layout consists of:
  // - Sometimes a left item, which may contain an icon or serve as
  //   an indenting space for label alignment
  // - Always a label
  // - Sometimes a right item, which contains an icon (submenu items)
  // - Sometimes a submenu-toggle control (only if the item has a submenu)
  const hasLeftItem = leftIcon || isSubmenuItem || icon === 'blank';
  const hasRightItem = rightIcon && isSubmenuItem;

  const menuItemContent = (
    <>
      {hasLeftItem && (
        <div
          className="w-7 flex items-center justify-center"
          data-testid="left-item-container"
        >
          {leftIcon}
        </div>
      )}
      <span className="flex items-center grow whitespace-nowrap px-1">
        {label}
      </span>
      {hasRightItem && (
        <div
          className="w-8 flex items-center justify-center"
          data-testid="right-item-container"
        >
          {rightIcon}
        </div>
      )}
      {hasSubmenuVisible && (
        <SubmenuToggle
          title={`Show actions for ${label}`}
          isExpanded={isSubmenuVisible}
          onToggleSubmenu={onToggleSubmenu}
        />
      )}
    </>
  );

  const wrapperClasses = classnames(
    'u-outline-on-keyboard-focus--inset',
    'w-full min-w-[150px] flex items-center select-none',
    'border-b',
    // Set this container as a "group" so that children may style based on its
    // layout state.
    // See https://tailwindcss.com/docs/hover-focus-and-other-states#styling-based-on-parent-state
    'group',
    {
      'min-h-[30px] font-normal': isSubmenuItem,
      'min-h-[40px] font-medium': !isSubmenuItem,
      'bg-grey-1 hover:bg-grey-3': isSubmenuItem || isExpanded,
      'bg-white hover:bg-grey-1': !isSubmenuItem && !isExpanded,
      // visual "padding" on the right is part of SubmenuToggle when rendered,
      // but when not rendering a SubmenuToggle, we need to add some padding here
      'pr-1': !hasSubmenuVisible,
    },
    {
      // When the item is selected, show a left border to indicate it
      'border-l-[4px] border-l-brand': isSelected,
      // Add equivalent padding to border size when not selected. This instead
      // of a transparent left border to make focus ring cover the full
      // menu item. Otherwise the focus ring will be inset on the left too far.
      'pl-[4px]': !isSelected,
      'border-b-grey-3': isExpanded,
      'border-b-transparent': !isExpanded,
      'text-color-text-light': isDisabled,
      'text-color-text': !isDisabled,
    }
  );

  if (href) {
    // The menu item is a link
    menuItem = (
      <a
        ref={menuItemRef}
        className={wrapperClasses}
        data-testid="menu-item"
        href={href}
        target="_blank"
        tabIndex={-1}
        rel="noopener noreferrer"
        role="menuitem"
        onKeyDown={onKeyDown}
      >
        {menuItemContent}
      </a>
    );
  } else {
    // The menu item is a clickable button or radio button.
    // In either case there may be an optional submenu.
    menuItem = (
      <div
        ref={menuItemRef}
        className={wrapperClasses}
        data-testid="menu-item"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={onClick}
        role={isRadioButtonType ? 'menuitemradio' : 'menuitem'}
        aria-checked={isRadioButtonType ? isSelected : undefined}
        aria-haspopup={hasSubmenuVisible}
        aria-expanded={hasSubmenuVisible ? isSubmenuVisible : undefined}
      >
        {menuItemContent}
      </div>
    );
  }
  return (
    <>
      {menuItem}
      {hasSubmenuVisible && (
        <Slider visible={/** @type {boolean} */ (isSubmenuVisible)}>
          <MenuKeyboardNavigation
            closeMenu={onCloseSubmenu}
            visible={/** @type {boolean} */ (isSubmenuVisible)}
            className="border-b"
          >
            {submenu}
          </MenuKeyboardNavigation>
        </Slider>
      )}
    </>
  );
}
