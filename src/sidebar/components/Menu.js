import classnames from 'classnames';
import { useElementShouldClose } from '@hypothesis/frontend-shared';
import { MenuExpandIcon } from '@hypothesis/frontend-shared/lib/next';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import MenuArrow from './MenuArrow';
import MenuKeyboardNavigation from './MenuKeyboardNavigation';

/**
 * Flag indicating whether the next click event on the menu's toggle button
 * should be ignored, because the action it would trigger has already been
 * triggered by a preceding "mousedown" event.
 */
let ignoreNextClick = false;

/**
 * @typedef MenuProps
 * @prop {'left'|'right'} [align] -
 *   Whether the menu content is aligned with the left (default) or right edges of the
 *   toggle element.
 * @prop {string} [arrowClass] -
 *   Additional CSS class for the arrow caret at the edge of the menu content that "points"
 *   toward the menu's toggle button. This can be used to adjust the position of that caret
 *   respective to the toggle button.
 * @prop {object|string} [label] - Label element for the toggle button that hides and shows the menu.
 * @prop {object} [children] -
 *   Menu items and sections to display in the content area of the menu.  These are typically
 *   `MenuSection` and `MenuItem` components, but other custom content is also allowed.
 * @prop {boolean} [containerPositioned] -
 *   Whether the menu elements should be positioned relative to the Menu container. When
 *   `false`, the consumer is responsible for positioning.
 * @prop {string} [contentClass] - Additional CSS classes to apply to the menu.
 * @prop {boolean} [defaultOpen] - Whether the menu is open or closed when initially rendered.
 *   Ignored if `open` is present.
 * @prop {(open: boolean) => void} [onOpenChanged] - Callback invoked when the menu is
 *   opened or closed.  This can be used, for example, to reset any ephemeral state that the
 *   menu content may have.
 * @prop {boolean} [open] - Whether the menu is currently open; overrides internal state
 *   management for openness. External components managing state in this way should
 *   also pass an `onOpenChanged` handler to respond when the user closes the menu.
 * @prop {string} title -
 *   A title for the menu. This is important for accessibility if the menu's toggle button
 *   has only an icon as a label.
 * @prop {boolean} [menuIndicator] -
 *   Whether to display an indicator next to the label that there is a dropdown menu.
 */

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
 *
 * @param {MenuProps} props
 */
export default function Menu({
  align = 'left',
  arrowClass = '',
  children,
  containerPositioned = true,
  contentClass,
  defaultOpen = false,
  label,
  open,
  onOpenChanged,
  menuIndicator = true,
  title,
}) {
  /** @type {[boolean, (open: boolean) => void]} */
  let [isOpen, setOpen] = useState(defaultOpen);
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

  // Toggle menu when user presses toggle button. The menu is shown on mouse
  // press for a more responsive/native feel but also handles a click event for
  // activation via other input methods.
  /** @param {Event} event */
  const toggleMenu = event => {
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
  const menuRef = /** @type {{ current: HTMLDivElement }} */ (useRef());

  // Menu element should close via `closeMenu` whenever it's open and there
  // are user interactions outside of it (e.g. clicks) in the document
  useElementShouldClose(menuRef, isOpen, closeMenu);

  /** @param {Event} e */
  const stopPropagation = e => e.stopPropagation();

  // It should also close if the user presses a key which activates menu items.
  /** @param {KeyboardEvent} event */
  const handleMenuKeyDown = event => {
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

  /** @type {{ position: 'relative'|'static' }} */
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
          'flex items-center justify-center rounded-sm transition-colors',
          {
            'text-grey-7 hover:text-grey-9': !isOpen,
            'text-brand': isOpen,
          }
        )}
        data-testid="menu-toggle-button"
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
              arrowClass
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
              contentClass
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
