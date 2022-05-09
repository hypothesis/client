import { toChildArray } from 'preact';

/** @typedef {import("preact").JSX.Element} JSXElement */

/**
 * @typedef MenuSectionProps
 * @prop {string} [heading] - Heading displayed at the top of the menu.
 * @prop {object} children - Menu items to display in this section.
 */

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
export default function MenuSection({ heading, children }) {
  return (
    <>
      {heading && (
        <h2 className="text-color-text-light p-3 leading-none uppercase">
          {heading}
        </h2>
      )}
      <ul className="border-b">
        {toChildArray(children).map(child => (
          <li key={/** @type {JSXElement} **/ (child).key}>{child}</li>
        ))}
      </ul>
    </>
  );
}
