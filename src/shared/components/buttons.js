import classnames from 'classnames';

import { SvgIcon } from '@hypothesis/frontend-shared';

/**
 * @typedef ButtonProps
 * @prop {import("preact").ComponentChildren} [children]
 * @prop {string} [className]
 * @prop {string} [icon] - Name of `SvgIcon` to render in the button
 * @prop {'left'|'right'} [iconPosition] - Icon positioned to left or to
 *   right of button text
 * @prop {boolean} [disabled]
 * @prop {boolean} [expanded] - Is the element associated with this button
 *   expanded (set `aria-expanded`)
 * @prop {boolean} [pressed] - Is this button currently "active?" (set
 *   `aria-pressed`)
 * @prop {() => any} [onClick]
 * @prop {string} [title] - Button title; used for `aria-label` attribute
 * @prop {'primary'} [variant] - For styling: element variant
 */

/**
 * @typedef IconButtonBaseProps
 * @prop {string} icon - Icon is required for icon buttons
 * @prop {string} title - Title is required for icon buttons
 */

/**
 * @typedef {ButtonProps & IconButtonBaseProps} IconButtonProps
 */

/**
 * @param {ButtonProps} props
 */
function ButtonBase({
  children,
  className,
  icon,
  iconPosition = 'left',
  disabled,
  expanded,
  pressed,
  onClick = () => {},
  title,
  variant,
}) {
  const otherAttributes = {};
  if (typeof disabled === 'boolean') {
    otherAttributes.disabled = disabled;
  }
  if (typeof title !== 'undefined') {
    otherAttributes.title = title;
    otherAttributes['aria-label'] = title;
  }

  if (typeof expanded === 'boolean') {
    otherAttributes['aria-expanded'] = expanded;
  }
  if (typeof pressed === 'boolean') {
    otherAttributes['aria-pressed'] = pressed;
  }

  return (
    <button
      className={classnames(className, {
        [`${className}--${variant}`]: variant,
        [`${className}--icon-${iconPosition}`]: icon,
      })}
      onClick={onClick}
      {...otherAttributes}
    >
      {children}
    </button>
  );
}

/**
 * An icon-only button
 *
 * @param {IconButtonProps} props
 */
export function IconButton(props) {
  const { className = 'IconButton', ...restProps } = props;
  const { icon } = props;
  return (
    <ButtonBase className={className} {...restProps}>
      <SvgIcon name={icon} />
    </ButtonBase>
  );
}

/**
 * A labeled button, with or without an icon
 *
 * @param {ButtonProps} props
 */
export function LabeledButton(props) {
  const { icon, iconPosition = 'left' } = props;
  const { children, className = 'LabeledButton', ...restProps } = props;
  return (
    <ButtonBase className={className} {...restProps}>
      {icon && iconPosition === 'left' && <SvgIcon name={icon} />}
      {children}
      {icon && iconPosition === 'right' && <SvgIcon name={icon} />}
    </ButtonBase>
  );
}

/**
 * A button styled to appear as an HTML link (<a>)
 *
 * @param {ButtonProps} props
 */
export function LinkButton(props) {
  const { children } = props;
  return (
    <ButtonBase className="LinkButton" {...props}>
      {children}
    </ButtonBase>
  );
}
