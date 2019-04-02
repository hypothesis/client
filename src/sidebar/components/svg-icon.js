'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

// The list of supported icons
const icons = {
  refresh: require('../../images/icons/refresh.svg'),
  cursor: require('../../images/icons/cursor.svg'),
};

/**
 * Component that renders icons using inline `<svg>` elements.
 * This enables their appearance to be customized via CSS.
 *
 * This matches the way we do icons on the website, see
 * https://github.com/hypothesis/h/pull/3675
 */
function SvgIcon({ name }) {
  if (!icons[name]) {
    throw new Error(`Unknown icon ${name}`);
  }
  const markup = { __html: icons[name] };
  return <span dangerouslySetInnerHTML={markup} />;
}

SvgIcon.propTypes = {
  /** The name of the icon to load. */
  name: propTypes.string,
};

module.exports = SvgIcon;
