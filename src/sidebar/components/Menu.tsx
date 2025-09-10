import { Popover } from '@hypothesis/frontend-shared';
import { MenuExpandIcon } from '@hypothesis/frontend-shared';
import CloseableContext from '@hypothesis/frontend-shared/lib/components/CloseableContext';
import classnames from 'classnames';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import MenuKeyboardNavigation from './MenuKeyboardNavigation';

export type MenuProps = {
  /**
   * Whether the menu content is aligned with the left (default) or right edges
   * of the toggle element.
   */
  align?: 'left' | 'right';

  /**
   * Label element or string for the toggle button that hides and shows the menu
   */
  label: ComponentChildren;

  /** Menu content, typically `MenuSection` and `MenuItem` components  */
  children: ComponentChildren;

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
  children,
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

  const toggleMenu = () => setOpen(!isOpen);
  const closeMenu = useCallback(() => setOpen(false), [setOpen]);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
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
        onClick={toggleMenu}
        aria-label={title}
        title={title}
        ref={buttonRef}
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
      <Popover
        open={isOpen}
        onClose={closeMenu}
        anchorElementRef={buttonRef}
        align={align}
        classes={classnames(
          '!max-h-full text-md !shadow-intense !rounded-lg',
          contentClass,
        )}
      >
        <CloseableContext.Provider value={{ onClose: closeMenu }}>
          <MenuKeyboardNavigation visible>{children}</MenuKeyboardNavigation>
        </CloseableContext.Provider>
      </Popover>
    </>
  );
}
