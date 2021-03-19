import classnames from 'classnames';

import { SvgIcon } from '@hypothesis/frontend-shared';

/**
 * @typedef ButtonProps
 * @prop {Object} [children]
 * @prop {string} [icon] - name of `SvgIcon` to render in the button
 * @prop {'left'|'right'} [iconPosition] - Icon positioned to left or to
 *   right of button text
 * @prop {boolean} [disabled]
 * @prop {boolean} [expanded] - Is the element associated with this button
 *   expanded (set `aria-expanded`)
 * @prop {boolean} [pressed] - Is this button currently "active?" (set
 *   `aria-pressed`)
 * @prop {() => any} [onClick]
 * @prop {'small'|'medium'|'large'} [size] - For styling, size variant
 * @prop {string} [title]
 * @prop {'primary'} [variant] - For styling: element variant
 */

/**
 * @typedef IconButtonBaseProps
 * @prop {string} icon - Icon is required for icon buttons
 * @prop {string} title - Title is required for icon buttons
 */

/**
 * @typedef {ButtonProps & { className: string }} ButtonBaseProps
 * @typedef {ButtonBaseProps & IconButtonBaseProps} IconButtonProps
 */

/**
 * @param {ButtonBaseProps} props
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
  size = 'medium',
  title,
  variant,
}) {
  const ariaAttributes = {};
  const otherAttributes = {};
  if (typeof disabled === 'boolean') {
    otherAttributes.disabled = disabled;
  }
  if (typeof title !== 'undefined') {
    otherAttributes.title = title;
    ariaAttributes['aria-label'] = title;
  }

  if (typeof expanded === 'boolean') {
    ariaAttributes['aria-expanded'] = expanded;
  }
  if (typeof pressed === 'boolean') {
    ariaAttributes['aria-pressed'] = pressed;
  }

  return (
    <button
      className={classnames(className, `${className}--size-${size}`, {
        [`${className}--${variant}`]: variant,
        [`${className}--icon-${iconPosition}`]: icon,
      })}
      onClick={onClick}
      {...otherAttributes}
      {...ariaAttributes}
    >
      {children}
    </button>
  );
}

/**
 * An icon-only button
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
 * A labeled button with no icon
 * @param {ButtonBaseProps} props
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

/**
 * A custom button. Forwards on provided `className`
 *
 * Uses `ButtonBaseProps` to allow `className`
 * @param {ButtonBaseProps} props
 */
export function CustomButton(props) {
  const { children } = props;
  return <ButtonBase {...props}>{children}</ButtonBase>;
}
