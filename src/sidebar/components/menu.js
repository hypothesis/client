import classnames from 'classnames';
import { Fragment, createElement } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import useElementShouldClose from './hooks/use-element-should-close';
import SvgIcon from './svg-icon';

let nextId = 0;

function useId(prefix) {
  const idRef = useRef(null);
  if (!idRef.current) {
    ++nextId;
    idRef.current = prefix + '-' + nextId;
  }
  return idRef.current;
}

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

function isElementVisible(element) {
  return element.offsetParent !== null;
}

function MenuList({ align, menuButtonId, contentClass, closeMenu, children }) {
  const menuRef = useRef(null);

  const handleMenuKeyDown = event => {
    const menuItems = Array.from(
      menuRef.current.querySelectorAll('[role^="menuitem"]')
    ).filter(isElementVisible);

    let focusedIndex = menuItems.findIndex(el =>
      el.contains(document.activeElement)
    );

    let handled = false;

    switch (event.key) {
      case 'Enter':
      case ' ':
        closeMenu();
        break;
      case 'ArrowUp':
        focusedIndex -= 1;
        if (focusedIndex < 0) {
          focusedIndex = menuItems.length - 1;
        }
        handled = true;
        break;
      case 'ArrowDown':
        focusedIndex += 1;
        if (focusedIndex === menuItems.length) {
          focusedIndex = 0;
        }
        handled = true;
        break;
      case 'Home':
        focusedIndex = 0;
        handled = true;
        break;
      case 'End':
        focusedIndex = menuItems.length - 1;
        handled = true;
        break;
    }

    if (handled && focusedIndex >= 0) {
      event.stopPropagation();
      event.preventDefault();

      menuItems[focusedIndex].focus();
    }
  };

  return (
    <div
      aria-labelledby={menuButtonId}
      className={classnames(
        'menu__content',
        `menu__content--align-${align}`,
        contentClass
      )}
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      onClick={closeMenu}
      onKeyDown={handleMenuKeyDown}
    >
      {children}
    </div>
  );
}

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

  const menuRef = useRef(null);
  const toggleButtonRef = useRef(null);

  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (wasOpen.current !== isOpen) {
      wasOpen.current = isOpen;

      // Focus first item in the menu when it is opened.
      if (isOpen) {
        const firstItem = menuRef.current.querySelector('[role^="menuitem"]');
        if (firstItem) {
          firstItem.focus();
        }
      } else {
        // When the menu is closed as a result of an action that doesn't transfer
        // focus outside of the menu, focus the toggle button that opens the menu.
        if (document.activeElement === document.body) {
          toggleButtonRef.current.focus();
        }
      }

      // Notify parent when menu is opened or closed.
      if (typeof onOpenChanged === 'function') {
        onOpenChanged(isOpen);
      }
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

  // Menu element should close via `closeMenu` whenever it's open and there
  // are user interactions outside of it (e.g. clicks) in the document
  useElementShouldClose(menuRef, isOpen, closeMenu);

  const stopPropagation = e => e.stopPropagation();

  const containerStyle = {
    position: containerPositioned ? 'relative' : 'static',
  };

  const menuButtonId = useId('menu-button');

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
        id={menuButtonId}
        onMouseDown={toggleMenu}
        onClick={toggleMenu}
        ref={toggleButtonRef}
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
          <MenuList
            menuButtonId={menuButtonId}
            align={align}
            contentClass={contentClass}
            closeMenu={closeMenu}
          >
            {children}
          </MenuList>
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
