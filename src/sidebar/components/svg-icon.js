'use strict';

const { cloneElement, createElement } = require('preact');
const { useMemo } = require('preact/hooks');
const propTypes = require('prop-types');

// The list of supported icons
const icons = {
  'add-group': require('../../images/icons/add-group.svg'),
  'collapse-menu': require('../../images/icons/collapse-menu.svg'),
  'expand-menu': require('../../images/icons/expand-menu.svg'),
  copy: require('../../images/icons/copy.svg'),
  cursor: require('../../images/icons/cursor.svg'),
  leave: require('../../images/icons/leave.svg'),
  refresh: require('../../images/icons/refresh.svg'),
  share: require('../../images/icons/share.svg'),
};

/**
 * Convert a DOM node's attributes to a `props` object for a React element.
 */
function propsFromAttrs(domNode) {
  const attrs = domNode.attributes;
  const props = {};
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    props[attr.name] = attr.value;
  }
  return props;
}

/**
 * Convert a DOM element and its children to a React/Preact element that can
 * be returned from a render function.
 */
function reactElementFromNode(domNode) {
  if (domNode.nodeType !== Node.ELEMENT_NODE) {
    // Support for non-Element nodes is not implemented.
    return null;
  }
  return createElement(
    domNode.localName,
    propsFromAttrs(domNode),
    Array.from(domNode.childNodes).map(reactElementFromNode)
  );
}

/**
 * Component that renders icons using inline `<svg>` elements.
 * This enables their appearance to be customized via CSS.
 *
 * This matches the way we do icons on the website, see
 * https://github.com/hypothesis/h/pull/3675
 */
function SvgIcon({ name, className = '' }) {
  if (!icons[name]) {
    throw new Error(`Unknown icon ${name}`);
  }

  // Convert the icon's SVG markup into a React element that this component can
  // return as its rendered output. We do this rather than using
  // `dangerouslySetInnerHTML` to avoid needing to include a wrapper element in
  // the output.
  let svgElement = useMemo(() => {
    const tmp = document.createElement('div');
    tmp.innerHTML = icons[name];
    return reactElementFromNode(tmp.firstElementChild);
  }, [name]);

  // Add any customized properties. We do this in a separate step to avoid
  // re-parsing the SVG if `name` has not changed.
  svgElement = useMemo(() => {
    if (className) {
      return cloneElement(svgElement, { className });
    } else {
      return svgElement;
    }
  }, [className, svgElement]);

  return svgElement;
}

SvgIcon.propTypes = {
  /** The name of the icon to load. */
  name: propTypes.string,

  /** A CSS class to apply to the `<svg>` element. */
  className: propTypes.string,
};

module.exports = SvgIcon;
