import { toChildArray } from 'preact';
import type { ComponentChildren, VNode } from 'preact';

export type MenuSectionProps = {
  /** Heading displayed at the top of the menu. */
  heading?: string;

  /** Menu items to display in this section. */
  children: ComponentChildren;
};

/**
 * Group a set of menu items together visually, with an optional header.
 *
 * @example
 *   <Menu label="Things">
 *     <MenuSection heading="Big things">
 *       <MenuItem .../>
 *       <MenuItem .../>
 *     </MenuSection>
 *     <MenuSection heading="Little things">
 *       <MenuItem .../>
 *       <MenuItem .../>
 *     </MenuSection>
 *   </Menu>
 *
 * @param {MenuSectionProps} props
 */
export default function MenuSection({ heading, children }: MenuSectionProps) {
  return (
    <>
      {heading && (
        <h2 className="text-color-text-light p-3 leading-none uppercase">
          {heading}
        </h2>
      )}
      <ul className="border-b">
        {toChildArray(children).map(child => (
          <li key={(child as VNode).key}>{child}</li>
        ))}
      </ul>
    </>
  );
}
