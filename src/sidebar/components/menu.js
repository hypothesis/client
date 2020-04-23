import classnames from 'classnames';
import { Fragment, createElement } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import useElementShouldClose from './hooks/use-element-should-close';
import { normalizeKeyName } from '../../shared/browser-compatibility-utils';

import SvgIcon from '../../shared/components/svg-icon';
import MenuKeyboardNavigation from './menu-keyboard-navigation';

// The triangular indicator below the menu toggle button that visually links it
// to the menu content.
const menuArrow = className => (
  <svg className={classnames('menu__arrow', className)} width={15} height={8}>
    <path d="M0 8 L7 0 L15 8" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/**
 * Flag indicating whether the next click event on the menu's toggle button
 * should be ignored, because the action it would trigger has already been
 * triggered by a preceding "mousedown" event.
 */
let ignoreNextClick = false;

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
  label,
  onOpenChanged,
  menuIndicator = true,
  title,
}) {
  const [isOpen, setOpen] = useState(defaultOpen);
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);

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
    // State variable so we know to set focus() on the first item when opened
    // via the keyboard. Note, when opening the menu via keyboard by pressing
    // enter or space, a simulated MouseEvent is created with a type value of
    // "click". We also know this is not a mouseup event because that condition
    // is checked above.
    if (!isOpen && event.type === 'click') {
      setOpenedByKeyboard(true);
    } else {
      setOpenedByKeyboard(false);
    }

    setOpen(!isOpen);
  };
  const closeMenu = useCallback(() => setOpen(false), [setOpen]);

  // Set up an effect which adds document-level event handlers when the menu
  // is open and removes them when the menu is closed or removed.
  //
  // These handlers close the menu when the user taps or clicks outside the
  // menu or presses Escape.
  const menuRef = useRef();

  // Menu element should close via `closeMenu` whenever it's open and there
  // are user interactions outside of it (e.g. clicks) in the document
  useElementShouldClose(menuRef, isOpen, closeMenu);

  const stopPropagation = e => e.stopPropagation();

  // It should also close if the user presses a key which activates menu items.
  const handleMenuKeyDown = event => {
    const key = normalizeKeyName(event.key);
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
      className="menu"
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
        className="menu__toggle"
        onMouseDown={toggleMenu}
        onClick={toggleMenu}
        title={title}
      >
        <span
          // wrapper is needed to serve as the flex layout for the label and indicator content.
          className="menu__toggle-wrapper"
        >
          {label}
          {menuIndicator && (
            <span
              className={classnames('menu__toggle-arrow', isOpen && 'is-open')}
            >
              <SvgIcon name="expand-menu" className="menu__toggle-icon" />
            </span>
          )}
        </span>
      </button>
      {isOpen && (
        <Fragment>
          {menuArrow(arrowClass)}
          <div
            className={classnames(
              'menu__content',
              `menu__content--align-${align}`,
              contentClass
            )}
            role="menu"
            tabIndex="-1"
            onClick={closeMenu}
            onKeyDown={handleMenuKeyDown}
          >
            <MenuKeyboardNavigation visible={openedByKeyboard}>
              {children}
            </MenuKeyboardNavigation>
          </div>
        </Fragment>
      )}
    </div>
  );
}

Menu.propTypes = {
  /**
   * Whether the menu content is aligned with the left (default) or right edges
   * of the toggle element.
   */
  align: propTypes.oneOf(['left', 'right']),

  /**
   * Additional CSS class for the arrow caret at the edge of the menu
   * content that "points" toward the menu's toggle button. This can be used
   * to adjust the position of that caret respective to the toggle button.
   */
  arrowClass: propTypes.string,

  /**
   * Label element for the toggle button that hides and shows the menu.
   */
  label: propTypes.oneOfType([
    propTypes.object.isRequired,
    propTypes.string.isRequired,
  ]),

  /**
   * Menu items and sections to display in the content area of the menu.
   *
   * These are typically `MenuSection` and `MenuItem` components, but other
   * custom content is also allowed.
   */
  children: propTypes.any,

  /**
   * Whether the menu elements should be positioned relative to the Menu
   * container. When `false`, the consumer is responsible for positioning.
   */
  containerPositioned: propTypes.bool,

  /**
   * Additional CSS classes to apply to the menu.
   */
  contentClass: propTypes.string,

  /**
   * Whether the menu is open or closed when initially rendered.
   */
  defaultOpen: propTypes.bool,

  /**
   * Callback invoked when the menu is opened or closed.
   *
   * This can be used, for example, to reset any ephemeral state that the
   * menu content may have.
   */
  onOpenChanged: propTypes.func,

  /**
   * A title for the menu. This is important for accessibility if the menu's
   * toggle button has only an icon as a label.
   */
  title: propTypes.string.isRequired,

  /**
   * Whether to display an indicator next to the label that there is a
   * dropdown menu.
   */
  menuIndicator: propTypes.bool,
};
