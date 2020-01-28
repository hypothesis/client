import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import SvgIcon from './svg-icon';

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
 *
 * Buttons have an option `actionType` value that maps the `isActive`
 * state to the appropriate corresponding aria attribute according to the
 * `actionType` rules defined in the propTypes def below.
 */
export default function Button({
  buttonText = '',
  className = '',
  icon = '',
  isActive = false,
  title,
  actionType,
  useCompactStyle = false,
  useInputStyle = false,
  usePrimaryStyle = false,
  ...props
}) {
  // If `buttonText` is provided, the `title` prop is optional and the `button`'s
  // `title` attribute will be set from the `buttonText`
  title = title || buttonText;

  const baseClassName = buttonText ? 'button--labeled' : 'button--icon-only';

  // The `actionType` determines which aria attribute is used to
  // express the `isActive` prop.
  //
  // "toggle" for aria-pressed
  // "group" for aria-expanded
  const ariaProp = {};
  if (actionType === 'toggle') {
    ariaProp['aria-pressed'] = isActive;
  } else if (actionType === 'group') {
    ariaProp['aria-expanded'] = isActive;
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
          'is-active': isActive,
        },
        className
      )}
      title={title}
      {...ariaProp}
      {...props}
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

  /** Is this button currently in an "active"/"on" state? */
  isActive: propTypes.bool,

  /**
   * `title`, used for button `title`, is required unless `buttonText` is present
   */
  title: requiredStringIfButtonTextMissing,

  /**
   * One of: "toggle", "group".
   *  "toggle" type uses the `aria-pressed` attribute in conjunction with `isActive`.
   *  "group" type uses the `aria-expanded` attribute in conjunction with `isActive`.
   *  If this property is not provided then both aria attributes are undefined.
   */
  actionType: propTypes.string,

  /** Allows a variant of button that takes up less space */
  useCompactStyle: propTypes.bool,

  /** Allows a variant of button that can sit right next to an input field */
  useInputStyle: propTypes.bool,

  /**
   * Does this button represent the "primary" action available? If so,
   * differentiating styles will be applied.
   */
  usePrimaryStyle: propTypes.bool,

  /**
   * Any other provided props will be passed directly to the
   * <button> tag. Use this for extra event handlers or attributes
   * not covered by the explicit props above.
   */
  props: propTypes.object,
};
