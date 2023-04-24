import {
  CaretUpIcon,
  MenuExpandIcon,
  Slider,
} from '@hypothesis/frontend-shared';
import type { IconComponent } from '@hypothesis/frontend-shared/lib/types';
import classnames from 'classnames';
import type { ComponentChildren, Ref } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import MenuKeyboardNavigation from './MenuKeyboardNavigation';

type SubmenuToggleProps = {
  title: string;
  isExpanded: boolean;
  onToggleSubmenu?: (e: Event) => void;
};

function SubmenuToggle({
  title,
  isExpanded,
  onToggleSubmenu,
}: SubmenuToggleProps) {
  // FIXME: Use `MenuCollapseIcon` instead of `CaretUpIcon` once size
  // disparities are addressed
  const Icon = isExpanded ? CaretUpIcon : MenuExpandIcon;
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
      <Icon className="w-3 h-3" />
    </div>
  );
}

export type MenuItemProps = {
  /**
   * URL of the external link to open when this item is clicked. Either the
   * `href` or an `onClick` callback should be supplied.
   */
  href?: string;

  /**
   * Icon to render for this item. This will show to the left of the item label
   * unless this is a submenu item, in which case it goes on the right. Ignored
   * if this is not a submenu item and `leftChannelContent` is also provided.
   */
  icon?: IconComponent;

  /**
   * Dim the label to indicate that this item is not currently available.  The
   * `onClick` callback will still be invoked when this item is clicked and the
   * submenu, if any, can still be toggled.
   */
  isDisabled?: boolean;

  /** Indicates that the submenu associated with this item is currently open */
  isExpanded?: boolean;

  /**
   * Display an indicator to show that this menu item represents something which
   * is currently selected/active/focused.
   */
  isSelected?: boolean;

  /**
   * True if this item is part of a submenu, in which case it is rendered with a
   * different style (shaded background)
   */
  isSubmenuItem?: boolean;

  /**
   * If present, display a button to toggle the sub-menu associated with this
   * item and indicate the current state; `true` if the submenu is visible.
   * Note. Omit this prop, or set it to null, if there is no `submenu`.
   */
  isSubmenuVisible?: boolean;

  label: ComponentChildren;

  /**
   * Optional content to render into a left channel. This accommodates small
   * non-icon images or spacing and will supersede any provided icon if this
   * is not a submenu item.
   */
  leftChannelContent?: ComponentChildren;

  onClick?: (e: Event) => void;
  onToggleSubmenu?: (e: Event) => void;
  /**
   * Contents of the submenu for this item.  This is typically a list of
   * `MenuItem` components with the `isSubmenuItem` prop set to `true`, but can
   * include other content as well. The submenu is only rendered if
   * `isSubmenuVisible` is `true`.
   */
  submenu?: ComponentChildren;
};

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
 * name of an icon registered in the application.
 *
 * For items that have submenus, the `MenuItem` will call the `renderSubmenu`
 * prop to render the content of the submenu, when the submenu is visible.
 * Note that the `submenu` is not supported for link (`href`) items.
 */
export default function MenuItem({
  href,
  icon: Icon,
  isDisabled,
  isExpanded,
  isSelected,
  isSubmenuItem,
  isSubmenuVisible,
  label,
  leftChannelContent,
  onClick,
  onToggleSubmenu,
  submenu,
}: MenuItemProps) {
  const menuItemRef = useRef<HTMLAnchorElement | HTMLDivElement | null>(null);

  let focusTimer: number | undefined;

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

  const onCloseSubmenu = (event: Event) => {
    if (onToggleSubmenu) {
      onToggleSubmenu(event);
    }
    // The focus won't work without delaying rendering.
    focusTimer = setTimeout(() => {
      menuItemRef.current!.focus();
    });
  };

  const onKeyDown = (event: KeyboardEvent) => {
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

  const renderedIcon = Icon ? <Icon className="h-3 w-3" /> : null;
  const leftIcon = !isSubmenuItem ? renderedIcon : null;
  const rightIcon = isSubmenuItem ? renderedIcon : null;

  const hasLeftChannel = leftChannelContent || isSubmenuItem || !!leftIcon;
  const hasRightContent = !!rightIcon;

  const menuItemContent = (
    <>
      {hasLeftChannel && (
        <div
          className="w-7 flex items-center justify-center"
          data-testid="left-item-container"
        >
          {leftChannelContent ?? leftIcon}
        </div>
      )}
      <span className="flex items-center grow whitespace-nowrap px-1">
        {label}
      </span>
      {hasRightContent && (
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
    'focus-visible-ring ring-inset',
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
        ref={menuItemRef as Ref<HTMLAnchorElement>}
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
        ref={menuItemRef as Ref<HTMLDivElement>}
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
        <Slider direction={isSubmenuVisible ? 'in' : 'out'}>
          <MenuKeyboardNavigation
            closeMenu={onCloseSubmenu}
            visible={isSubmenuVisible}
            className="border-b"
          >
            {submenu}
          </MenuKeyboardNavigation>
        </Slider>
      )}
    </>
  );
}
