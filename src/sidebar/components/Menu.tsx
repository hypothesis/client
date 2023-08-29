import { useElementShouldClose } from '@hypothesis/frontend-shared';
import { MenuExpandIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import MenuArrow from './MenuArrow';
import MenuKeyboardNavigation from './MenuKeyboardNavigation';

/**
 * Flag indicating whether the next click event on the menu's toggle button
 * should be ignored, because the action it would trigger has already been
 * triggered by a preceding "mousedown" event.
 */
let ignoreNextClick = false;

export type MenuProps = {
  /**
   * Whether the menu content is aligned with the left (default) or right edges
   * of the toggle element.
   */
  align?: 'left' | 'right';

  /**
   * Additional CSS class for the arrow caret at the edge of the menu content
   * that "points" toward the menu's toggle button. This can be used to adjust
   * the position of that caret respective to the toggle button.
   */
  arrowClass?: string;

  /**
   * Label element or string for the toggle button that hides and shows the menu
   */
  label: ComponentChildren;

  /** Menu content, typically `MenuSection` and `MenuItem` components  */
  children: ComponentChildren;

  /**
   * Whether the menu elements should be positioned relative to the Menu
   * container. When `false`, the consumer is responsible for positioning.
   */
  containerPositioned?: boolean;

  /** Additional CSS classes to apply to the Menu */
  contentClass?: string;

  /**
   * Whether the menu is open when initially rendered. Ignored if `open` is
   * present.
   */
  defaultOpen?: boolean;

  disabled?: boolean;

  /** Whether to render an (arrow) indicator next to the Menu label */
  menuIndicator?: boolean;

  /** Callback when the Menu is opened or closed. */
  onOpenChanged?: (open: boolean) => void;

  /**
   * Whether the Menu is currently open, when the Menu is being used as a
   * controlled component. In these cases, an `onOpenChanged` handler should
   * be provided to respond to the user opening or closing the menu.
   */
  open?: boolean;

  /**
   * A title for the menu. This is important for accessibility if the menu's
   * toggle button has only an icon as a label.
   */
  title: string;
};

const noop = () => {};

/**
 * A drop-down menu.
 *
 * Menus consist of a button which toggles whether the menu is open, an
 * an arrow indicating the state of the menu and content when is shown when
 * the menu is open. The children of the menu component are rendered as the
 * content of the menu when open. Typically this consists of a list of
 * `MenuSection` and/or `MenuItem` components.
 *
 * @example
 *   <Menu label="Preferences">
 *     <MenuItem label="View" onClick={showViewSettings}/>
 *     <MenuItem label="Theme" onClick={showThemeSettings}/>
 *     <MenuSection>
 *       <MenuItem label="Log out"/>
 *     </MenuSection>
 *   </Menu>
 */
export default function Menu({
  align = 'left',
  arrowClass = '',
  children,
  containerPositioned = true,
  contentClass,
  defaultOpen = false,
  disabled = false,
  label,
  open,
  onOpenChanged,
  menuIndicator = true,
  title,
}: MenuProps) {
  let [isOpen, setOpen]: [boolean, (open: boolean) => void] =
    useState(defaultOpen);
  if (typeof open === 'boolean') {
    isOpen = open;
    setOpen = onOpenChanged || noop;
  }

  // Notify parent when menu is opened or closed.
  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (typeof onOpenChanged === 'function' && wasOpen.current !== isOpen) {
      wasOpen.current = isOpen;
      onOpenChanged(isOpen);
    }
  }, [isOpen, onOpenChanged]);

  /**
   * Toggle menu when user presses toggle button. The menu is shown on mouse
   * press for a more responsive/native feel but also handles a click event for
   * activation via other input methods.
   */
  const toggleMenu = (event: Event) => {
    // If the menu was opened on press, don't close it again on the subsequent
    // mouse up ("click") event.
    if (event.type === 'mousedown') {
      ignoreNextClick = true;
    } else if (event.type === 'click' && ignoreNextClick) {
      // Ignore "click" event triggered from the mouse up action.
      ignoreNextClick = false;
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    setOpen(!isOpen);
  };
  const closeMenu = useCallback(() => setOpen(false), [setOpen]);

  // Set up an effect which adds document-level event handlers when the menu
  // is open and removes them when the menu is closed or removed.
  //
  // These handlers close the menu when the user taps or clicks outside the
  // menu or presses Escape.
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Menu element should close via `closeMenu` whenever it's open and there
  // are user interactions outside of it (e.g. clicks) in the document
  useElementShouldClose(menuRef, isOpen, closeMenu);

  const stopPropagation = (e: Event) => e.stopPropagation();

  // It should also close if the user presses a key which activates menu items.
  const handleMenuKeyDown = (event: KeyboardEvent) => {
    const key = event.key;
    if (key === 'Enter' || key === ' ') {
      // The browser will not open the link if the link element is removed
      // from within the keypress event that triggers it. Add a little
      // delay to work around that.
      setTimeout(() => {
        closeMenu();
      });
    }
  };

  const containerStyle = {
    position: containerPositioned ? 'relative' : 'static',
  };

  return (
    // See https://github.com/evcohen/eslint-plugin-jsx-a11y/blob/master/docs/rules/no-static-element-interactions.md#case-the-event-handler-is-only-being-used-to-capture-bubbled-events
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="relative"
      data-testid="menu-container"
      ref={menuRef}
      // Add inline styles for positioning
      style={containerStyle}
      // Don't close the menu if the mouse is released over one of the menu
      // elements outside the content area (eg. the arrow at the top of the
      // content).
      onClick={stopPropagation}
      // Don't close the menu if the user presses the mouse down on menu elements
      // except for the toggle button.
      onMouseDown={stopPropagation}
    >
      <button
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup={true}
        className={classnames(
          'focus-visible-ring',
          'flex items-center justify-center rounded transition-colors',
          {
            'text-grey-7 hover:text-grey-9': !isOpen,
            'text-brand': isOpen,
          },
        )}
        data-testid="menu-toggle-button"
        disabled={disabled}
        onMouseDown={toggleMenu}
        onClick={toggleMenu}
        aria-label={title}
        title={title}
      >
        <span
          // wrapper is needed to serve as the flex layout for the label and indicator content.
          className="flex items-center gap-x-1"
        >
          {label}
          {menuIndicator && (
            <span
              className={classnames({
                'rotate-180 text-color-text': isOpen,
              })}
            >
              <MenuExpandIcon className="w-2.5 h-2.5" />
            </span>
          )}
        </span>
      </button>
      {isOpen && (
        <>
          <MenuArrow
            direction="up"
            classes={classnames(
              // Position menu-arrow caret near bottom right of menu label/toggle control
              'right-0 top-[calc(100%-3px)] w-[15px]',
              arrowClass,
            )}
          />
          <div
            className={classnames(
              'focus-visible-ring',
              // Position menu content near bottom of menu label/toggle control
              'absolute top-[calc(100%+5px)] z-1 border shadow',
              'bg-white text-md',
              {
                'left-0': align === 'left',
                'right-0': align === 'right',
              },
              contentClass,
            )}
            data-testid="menu-content"
            role="menu"
            tabIndex={-1}
            onClick={closeMenu}
            onKeyDown={handleMenuKeyDown}
          >
            <MenuKeyboardNavigation visible={true}>
              {children}
            </MenuKeyboardNavigation>
          </div>
        </>
      )}
    </div>
  );
}
