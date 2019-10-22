'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const { useLayoutEffect, useRef } = require('preact/hooks');
const propTypes = require('prop-types');

// The list of supported icons
const icons = {
  add: require('../../images/icons/add.svg'),
  annotate: require('../../images/icons/annotate.svg'),
  'arrow-left': require('../../images/icons/arrow-left.svg'),
  'arrow-right': require('../../images/icons/arrow-right.svg'),
  cancel: require('../../images/icons/cancel.svg'),
  'collapse-menu': require('../../images/icons/collapse-menu.svg'),
  'expand-menu': require('../../images/icons/expand-menu.svg'),
  copy: require('../../images/icons/copy.svg'),
  cursor: require('../../images/icons/cursor.svg'),
  email: require('../../images/icons/email.svg'),
  external: require('../../images/icons/external.svg'),
  facebook: require('../../images/icons/facebook.svg'),
  groups: require('../../images/icons/groups.svg'),
  help: require('../../images/icons/help.svg'),
  highlight: require('../../images/icons/highlight.svg'),
  leave: require('../../images/icons/leave.svg'),
  lock: require('../../images/icons/lock.svg'),
  logo: require('../../images/icons/logo.svg'),
  public: require('../../images/icons/public.svg'),
  refresh: require('../../images/icons/refresh.svg'),
  reply: require('../../images/icons/reply.svg'),
  share: require('../../images/icons/share.svg'),
  twitter: require('../../images/icons/twitter.svg'),
};

/**
 * Component that renders icons using inline `<svg>` elements.
 * This enables their appearance to be customized via CSS.
 *
 * This matches the way we do icons on the website, see
 * https://github.com/hypothesis/h/pull/3675
 */
function SvgIcon({ name, className = '', inline = false }) {
  if (!icons[name]) {
    throw new Error(`Unknown icon ${name}`);
  }
  const markup = { __html: icons[name] };

  const element = useRef();
  useLayoutEffect(() => {
    const svg = element.current.querySelector('svg');
    svg.setAttribute('class', className);
  }, [
    className,
    // `markup` is a dependency of this effect because the SVG is replaced if
    // it changes.
    markup,
  ]);

  return (
    <span
      className={classnames('svg-icon', { 'svg-icon--inline': inline })}
      dangerouslySetInnerHTML={markup}
      ref={element}
    />
  );
}

SvgIcon.propTypes = {
  /** The name of the icon to load. */
  name: propTypes.string,

  /** A CSS class to apply to the `<svg>` element. */
  className: propTypes.string,

  /** Apply a style allowing for inline display of icon wrapper */
  inline: propTypes.bool,
};

module.exports = SvgIcon;
