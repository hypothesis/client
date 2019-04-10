'use strict';

const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');

const map = val => (Array.isArray(val) ? val : [val]);

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
 */
function MenuSection({ heading, children }) {
  return (
    <Fragment>
      {heading && <h2 className="menu-section__heading">{heading}</h2>}
      <ul className="menu-section__content">
        {map(children, child => (
          <li key={child.key}>{child}</li>
        ))}
      </ul>
    </Fragment>
  );
}

MenuSection.propTypes = {
  /**
   * Heading displayed at the top of the menu.
   */
  heading: propTypes.string,

  /**
   * Menu items to display in this section.
   */
  children: propTypes.oneOfType([
    propTypes.object,
    propTypes.arrayOf(propTypes.object),
  ]).isRequired,
};

module.exports = MenuSection;
