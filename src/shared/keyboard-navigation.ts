import type { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

import { ListenerCollection } from './listener-collection';

function isElementDisabled(
  element: HTMLElement & { disabled?: boolean }
): element is HTMLElement & { disabled: true } {
  return typeof element.disabled === 'boolean' && element.disabled;
}

function isElementVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null;
}

export type ArrowKeyNavigationOptions = {
  /**
   * Whether to focus the first element in the set of matching elements when the
   * component is mounted
   */
  autofocus?: boolean;

  /** Enable navigating elements using left/right arrow keys */
  horizontal?: boolean;
  /** Enable navigating elements using up/down arrow keys */
  vertical?: boolean;
  /** CSS selector which specifies the elements that navigation moves between */
  selector?: string;
};

/**
 * Enable arrow key navigation between interactive descendants of a
 * container element.
 *
 * In addition to moving focus between elements when arrow keys are pressed,
 * this also implements the "roving tabindex" pattern [1] which sets the
 * `tabindex` attribute of elements to control which element gets focus when the
 * user tabs into the container.
 *
 * See [2] for a reference of how keyboard navigation should work in web
 * applications and how it applies to various common widgets.
 *
 * @example
 *   function MyToolbar() {
 *     const container = useRef();
 *
 *     // Enable arrow key navigation between interactive elements in the
 *     // toolbar container.
 *     useArrowKeyNavigation(container);
 *
 *     return (
 *       <div ref={container} role="toolbar">
 *         <button>Bold</bold>
 *         <button>Italic</bold>
 *         <a href="https://example.com/help">Help</a>
 *       </div>
 *     )
 *   }
 *
 * [1] https://www.w3.org/TR/wai-aria-practices/#kbd_roving_tabindex
 * [2] https://www.w3.org/TR/wai-aria-practices/#keyboard
 */
export function useArrowKeyNavigation(
  containerRef: RefObject<HTMLElement>,
  {
    autofocus = false,
    horizontal = true,
    vertical = true,
    selector = 'a,button',
  }: ArrowKeyNavigationOptions = {}
) {
  useEffect(() => {
    if (!containerRef.current) {
      throw new Error('Container ref not set');
    }
    const container = containerRef.current;

    const getNavigableElements = () => {
      const elements: HTMLElement[] = Array.from(
        container.querySelectorAll(selector)
      );
      return elements.filter(
        el => isElementVisible(el) && !isElementDisabled(el)
      );
    };

    /**
     * Update the `tabindex` attribute of navigable elements.
     *
     * Exactly one element will have `tabindex=0` and all others will have
     * `tabindex=1`.
     *
     * @param currentIndex - Index of element in `elements` to make current.
     *   Defaults to the current element if there is one, or the first element
     *   otherwise.
     * @param setFocus - Whether to focus the current element
     */
    const updateTabIndexes = (
      elements: HTMLElement[] = getNavigableElements(),
      currentIndex = -1,
      setFocus = false
    ) => {
      if (currentIndex < 0) {
        currentIndex = elements.findIndex(el => el.tabIndex === 0);
        if (currentIndex < 0) {
          currentIndex = 0;
        }
      }

      for (const [index, element] of elements.entries()) {
        element.tabIndex = index === currentIndex ? 0 : -1;
        if (index === currentIndex && setFocus) {
          element.focus();
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const elements = getNavigableElements();
      let currentIndex = elements.findIndex(item => item.tabIndex === 0);

      let handled = false;
      if (
        (horizontal && event.key === 'ArrowLeft') ||
        (vertical && event.key === 'ArrowUp')
      ) {
        if (currentIndex === 0) {
          currentIndex = elements.length - 1;
        } else {
          --currentIndex;
        }
        handled = true;
      } else if (
        (horizontal && event.key === 'ArrowRight') ||
        (vertical && event.key === 'ArrowDown')
      ) {
        if (currentIndex === elements.length - 1) {
          currentIndex = 0;
        } else {
          ++currentIndex;
        }
        handled = true;
      } else if (event.key === 'Home') {
        currentIndex = 0;
        handled = true;
      } else if (event.key === 'End') {
        currentIndex = elements.length - 1;
        handled = true;
      }

      if (!handled) {
        return;
      }

      updateTabIndexes(elements, currentIndex, true);

      event.preventDefault();
      event.stopPropagation();
    };

    updateTabIndexes(getNavigableElements(), 0, autofocus);

    const listeners = new ListenerCollection();

    // Set an element as current when it gains focus. In Safari this event
    // may not be received if the element immediately loses focus after it
    // is triggered.
    listeners.add(container, 'focusin', event => {
      const elements = getNavigableElements();
      const targetIndex = elements.indexOf(event.target as HTMLElement);
      if (targetIndex >= 0) {
        updateTabIndexes(elements, targetIndex);
      }
    });

    listeners.add(container, 'keydown', onKeyDown);

    // Update the tab indexes of elements as they are added, removed, enabled
    // or disabled.
    const mo = new MutationObserver(() => {
      updateTabIndexes();
    });
    mo.observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled'],
      childList: true,
    });

    return () => {
      listeners.removeAll();
      mo.disconnect();
    };
  }, [autofocus, containerRef, horizontal, selector, vertical]);
}
