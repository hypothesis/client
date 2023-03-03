import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

function isElementVisible(element: HTMLElement) {
  return element.offsetParent !== null;
}

export type MenuKeyboardNavigationProps = {
  className?: string;

  /** Callback invoked when the menu is closed via a keyboard command. */
  closeMenu?: (e: KeyboardEvent) => void;

  /**
   * If true, the first element in children with `role=menuitem` is focused when
   * this component is mounted.
   */
  visible?: boolean;

  /** Content to display, which is typically a list of `<MenuItem>` elements. */
  children: ComponentChildren;
};

/**
 * Helper component used by Menu and MenuItem to facilitate keyboard navigation of a
 * list of <MenuItem> components. This component should not be used directly.
 *
 * Note that `ArrowRight` shall be handled by the parent <MenuItem> directly and
 * all other focus() related navigation is handled here.
 */
export default function MenuKeyboardNavigation({
  className,
  closeMenu,
  children,
  visible,
}: MenuKeyboardNavigationProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let focusTimer: number | undefined;
    if (visible) {
      focusTimer = setTimeout(() => {
        // The focus won't work without delaying rendering.
        const firstItem = menuRef.current!.querySelector(
          '[role^="menuitem"]'
        ) as HTMLElement;
        if (firstItem) {
          firstItem.focus();
        }
      });
    }
    return () => {
      // unmount
      clearTimeout(focusTimer);
    };
  }, [visible]);

  const onKeyDown = (event: KeyboardEvent) => {
    const menuItems = Array.from(
      menuRef.current!.querySelectorAll(
        '[role^="menuitem"]'
      ) as NodeListOf<HTMLElement>
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
    // This element needs to have role="menu" to facilitate readers
    // correctly enumerating discrete submenu items, but it also needs
    // to facilitate keydown events for navigation. Disable the linter
    // error so it can do both.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div role="menu" className={className} ref={menuRef} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}
