import { createElement } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import propTypes from 'prop-types';

function isElementVisible(element) {
  return element.offsetParent !== null;
}

/**
 * Helper component used by Menu and MenuItem to facilitate keyboard navigation of a
 * list of <MenuItem> components. This component should not be used directly.
 *
 * Note that `ArrowRight` shall be handled by the parent <MenuItem> directly and
 * all other focus() related  navigation is handled here.
 */
export default function MenuKeyboardNavigation({
  className,
  closeMenu,
  children,
  visible,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // The focus won't work without delaying rendering.
      setTimeout(() => {
        const firstItem = menuRef.current.querySelector('[role^="menuitem"]');
        if (firstItem) {
          firstItem.focus();
        }
      });
    }
  }, [visible]);

  const onKeyDown = event => {
    const menuItems = Array.from(
      menuRef.current.querySelectorAll('[role^="menuitem"]')
    ).filter(isElementVisible);

    let focusedIndex = menuItems.findIndex(el =>
      el.contains(document.activeElement)
    );

    let handled = false;

    switch (event.key) {
      case 'ArrowLeft':
      case 'Escape':
        if (closeMenu) {
          closeMenu(event);
          handled = true;
        }
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
    <div role="none" className={className} ref={menuRef} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

MenuKeyboardNavigation.propTypes = {
  className: propTypes.string,

  // Callback when the menu is closed via keyboard input
  closeMenu: propTypes.func,

  // When  true`, sets focus on the first item in the list
  // which has a role="menuitem" attribute.
  visible: propTypes.bool,

  // Array of nodes which may contain MenuItems
  children: propTypes.any,
};
