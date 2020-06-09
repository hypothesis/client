import { createElement } from 'preact';
import propTypes from 'prop-types';

import SvgIcon from '../../shared/components/svg-icon';

/**
 * A button.
 *
 * By default, styling will be applied for the button based on its general
 * "type" (e.g. an icon-only button, a labeled button). The presence of a
 * `className` prop will disable all default styling.
 */
export default function Button({
  buttonText = '',
  className = '',
  disabled = false,
  icon = '',
  isExpanded,
  isPressed,
  onClick = () => null,
  style = {},
  title,
}) {
  // If `buttonText` is provided, the `title` prop is optional and the `button`'s
  // `title` attribute will be set from the `buttonText`
  title = title || buttonText;

  const buttonModifier = buttonText ? 'labeled' : 'icon-only';
  // `className` overrides default class naming when present
  const baseClassName = className || `button--${buttonModifier}`;

  const extraProps = {};

  // If there is no displayed text in the button, or if the provided `title`
  // differs from the displayed text, add `aria-label` and `title` attributes
  if (!buttonText || title !== buttonText) {
    extraProps.title = title;
    extraProps['aria-label'] = title;
  }
  if (typeof isPressed === 'boolean') {
    // Indicate that this is a toggle button.
    extraProps['aria-pressed'] = isPressed;
  }
  if (typeof isExpanded === 'boolean') {
    extraProps['aria-expanded'] = isExpanded;
  }

  return (
    <button
      className={baseClassName}
      onClick={onClick}
      style={style}
      disabled={disabled}
      {...extraProps}
    >
      {icon && <SvgIcon name={icon} />}
      {buttonText}
    </button>
  );
}

/**
 * Validation callback for `propTypes`. The given `propName` is conditionally
 * required depending on the presence or absence of the `buttonText` property. Return
 * an `Error` on validation failure, per propTypes API.
 *
 * @return {Error|undefined}
 */
function requiredStringIfButtonTextMissing(props, propName, componentName) {
  if (
    typeof props.buttonText !== 'string' &&
    typeof props[propName] !== 'string'
  ) {
    return new Error(
      `string property '${propName}' must be supplied to component '${componentName}'\
if string property 'buttonText' omitted`
    );
  }
  return undefined;
}

Button.propTypes = {
  /**
   * The presence of this property indicates that the button will have a
   * visibly-rendered label (with this prop's value). For brevity, when providing
   * `buttonText`, the `title` prop is optional—if `title` is not present,
   * the value of `buttonText` will be used for the button's `title` attribute,
   * as they are typically identical. When this prop is missing, an icon-only
   * button will be rendered.
   */
  buttonText: propTypes.string,

  /**
   * When present, this will be used as the base class name and will override
   * all styling. See `buttons` SCSS mixins module for more details.
   */
  className: propTypes.string,

  /**
   * The name of the SVGIcon to render. This is optional if a `buttonText` is
   * provided.
   */
  icon: requiredStringIfButtonTextMissing,

  /**
   * Is the expandable element controlled by this button currently expanded?
   */
  isExpanded: propTypes.bool,

  /**
   * Indicate that this is a toggle button (if `isPressed` is a boolean) and
   * whether it is pressed.
   *
   * If omitted, the button is a non-toggle button.
   */
  isPressed: propTypes.bool,

  /** callback for button clicks */
  onClick: propTypes.func,

  /** disables the button when true */
  disabled: propTypes.bool,

  /** optional inline styling  */
  style: propTypes.object,

  /**
   * `title`, used for button `title`, is required unless `buttonText` is present
   */
  title: requiredStringIfButtonTextMissing,
};
