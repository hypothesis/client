import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import SvgIcon from '../../shared/components/svg-icon';

/**
 * A button, one of three base types depending on provided props:
 * - Icon-only button: `icon` present, `buttonText` missing
 * - Text-only button: `buttonText` present, `icon` missing
 * - Icon and text: both `icon` and `buttonText` present
 *
 * Buttons may be additionally styled with 0 to n of (none are mutually exclusive):
 * - `useCompactStyle`: for fitting into tighter spaces
 * - `useInputStyle`: for placing an icon-only button next to an input field
 * - `usePrimaryStyle`: for applying "primary action" styling
 * - `className`: arbitrary additional class name(s) to apply
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
  useCompactStyle = false,
  useInputStyle = false,
  usePrimaryStyle = false,
}) {
  // If `buttonText` is provided, the `title` prop is optional and the `button`'s
  // `title` attribute will be set from the `buttonText`
  title = title || buttonText;

  const baseClassName = buttonText ? 'button--labeled' : 'button--icon-only';

  const extraProps = {};
  if (typeof isPressed === 'boolean') {
    // Indicate that this is a toggle button.
    extraProps['aria-pressed'] = isPressed;
  }
  if (typeof isExpanded === 'boolean') {
    extraProps['aria-expanded'] = isExpanded;
  }

  return (
    <button
      className={classnames(
        'button',
        baseClassName,
        {
          'button--compact': useCompactStyle,
          'button--input': useInputStyle,
          'button--primary': usePrimaryStyle,
          'is-active': isPressed,
        },
        className
      )}
      onClick={onClick}
      title={title}
      style={style}
      disabled={disabled}
      {...extraProps}
    >
      {icon && <SvgIcon name={icon} className="button__icon" />}
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
   * optional CSS classes to add to the `button` element. These classes may
   * control color, etc., but should not define padding or layout, which are
   * owned by this component
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

  /** Allows a variant of button that takes up less space */
  useCompactStyle: propTypes.bool,

  /** Allows a variant of button that can sit right next to an input field */
  useInputStyle: propTypes.bool,

  /**
   * Does this button represent the "primary" action available? If so,
   * differentiating styles will be applied.
   */
  usePrimaryStyle: propTypes.bool,
};
