import classnames from 'classnames';
import { createElement } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import propTypes from 'prop-types';

/**
 * Object mapping icon names to SVG markup.
 *
 * @typedef {Object.<string,string>} IconMap
 */

/**
 * @template T
 * @typedef {import("preact/hooks").Ref<T>} Ref
 */

/**
 * Map of icon name to SVG data.
 *
 * @type {IconMap}
 */
let iconRegistry = {};

/**
 * @typedef SvgIconProps
 * @prop {string} name - The name of the icon to display.
 *   The name must match a name that has already been registered using the
 *   `registerIcons` function.
 * @prop {string} [className] - A CSS class to apply to the `<svg>` element.
 * @prop {boolean} [inline] - Apply a style allowing for inline display of icon wrapper.
 * @prop {string} [title] - Optional title attribute to apply to the SVG's containing `span`.
 */

/**
 * Component that renders icons using inline `<svg>` elements.
 * This enables their appearance to be customized via CSS.
 *
 * This matches the way we do icons on the website, see
 * https://github.com/hypothesis/h/pull/3675
 *
 * @param {SvgIconProps} props
 */
export default function SvgIcon({
  name,
  className = '',
  inline = false,
  title = '',
}) {
  if (!iconRegistry[name]) {
    throw new Error(`Icon name "${name}" is not registered`);
  }
  const markup = { __html: iconRegistry[name] };

  const element = /** @type {Ref<HTMLElement>} */ (useRef());
  useLayoutEffect(() => {
    const svg = element.current.querySelector('svg');

    // The icon should always contain an `<svg>` element, but check here as we
    // don't validate the markup when it is registered.
    if (svg) {
      svg.setAttribute('class', className);
    }
  }, [
    className,
    // `markup` is a dependency of this effect because the SVG is replaced if
    // it changes.
    markup,
  ]);

  const spanProps = {};
  if (title) {
    spanProps.title = title;
  }

  return (
    <span
      className={classnames('svg-icon', { 'svg-icon--inline': inline })}
      dangerouslySetInnerHTML={markup}
      ref={element}
      {...spanProps}
    />
  );
}

SvgIcon.propTypes = {
  name: propTypes.string.isRequired,
  className: propTypes.string,
  inline: propTypes.bool,
  title: propTypes.string,
};

/**
 * Register icons for use with the `SvgIcon` component.
 *
 * @param {IconMap} icons
 * @param {Object} options
 *  @param {boolean} [options.reset] - If `true`, remove existing registered icons.
 */
export function registerIcons(icons, { reset = false } = {}) {
  if (reset) {
    iconRegistry = {};
  }
  Object.assign(iconRegistry, icons);
}

/**
 * Return the currently available icons.
 *
 * To register icons, don't mutate this directly but call `registerIcons`
 * instead.
 *
 * @return {IconMap}
 */
export function availableIcons() {
  return iconRegistry;
}
