'use strict';

const classnames = require('classnames');
const { Fragment, createElement } = require('preact');
const { useCallback, useEffect, useRef, useState } = require('preact/hooks');
const propTypes = require('prop-types');

const { listen } = require('../util/dom');

const SvgIcon = require('./svg-icon');

// The triangular indicator below the menu toggle button that visually links it
// to the menu content.
const menuArrow = (
  <svg className="menu__arrow" width={15} height={8}>
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
function Menu({
  align = 'left',
  children,
  defaultOpen = false,
  label,
  menuIndicator = true,
  title,
}) {
  const [isOpen, setOpen] = useState(defaultOpen);

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
  const menuRef = useRef();
  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    const removeListeners = listen(
      document.body,
      ['keypress', 'click', 'mousedown'],
      event => {
        if (event.type === 'keypress' && event.key !== 'Escape') {
          return;
        }
        if (
          event.type === 'mousedown' &&
          menuRef.current &&
          menuRef.current.contains(event.target)
        ) {
          // Close the menu as soon as the user _presses_ the mouse outside the
          // menu, but only when they _release_ the mouse if they click inside
          // the menu.
          return;
        }
        closeMenu();
      }
    );

    return removeListeners;
  }, [closeMenu, isOpen]);

  return (
    <div className="menu" ref={menuRef}>
      <button
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup={true}
        className="menu__toggle"
        onMouseDown={toggleMenu}
        onClick={toggleMenu}
        title={title}
      >
        {label}
        {menuIndicator && (
          <span className="menu__toggle-arrow">
            <SvgIcon name="expand-menu" className="menu__toggle-icon" />
          </span>
        )}
      </button>
      {isOpen && (
        <Fragment>
          {menuArrow}
          <div
            className={classnames(
              'menu__content',
              `menu__content--align-${align}`
            )}
            role="menu"
          >
            {children}
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
  children: propTypes.oneOfType([
    propTypes.object,
    propTypes.arrayOf(propTypes.object),
  ]),

  /**
   * Whether the menu is open or closed when initially rendered.
   */
  defaultOpen: propTypes.bool,

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

module.exports = Menu;
