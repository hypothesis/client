import classnames from 'classnames';

import { SvgIcon } from '@hypothesis/frontend-shared';

/**
 * @typedef ButtonProps
 * @prop {Object} [children]
 * @prop {string} [icon] - name of `SvgIcon` to render in the button
 * @prop {'left'|'right'} [iconPosition] - Icon positioned to left or to
 *   right of button text
 * @prop {boolean} [isDisabled]
 * @prop {boolean} [isExpanded] - Is the element associated with this button
 *   expanded (set `aria-expanded`)
 * @prop {boolean} [isPressed] - Is this button currently "active?" (set
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
 * @typedef {ButtonProps & IconButtonBaseProps} IconButtonProps
 */

/**
 * @param {ButtonBaseProps} props
 */
function ButtonBase({
  children,
  className,
  icon,
  iconPosition = 'left',
  isDisabled,
  isExpanded,
  isPressed,
  onClick = () => {},
  size = 'medium',
  title,
  variant,
}) {
  const ariaAttributes = {};
  const otherAttributes = {};
  if (typeof isDisabled === 'boolean') {
    otherAttributes.disabled = isDisabled;
  }
  if (typeof title !== 'undefined') {
    otherAttributes.title = title;
    ariaAttributes['aria-label'] = title;
  }

  if (typeof isExpanded === 'boolean') {
    ariaAttributes['aria-expanded'] = isExpanded;
  }
  if (typeof isPressed === 'boolean') {
    ariaAttributes['aria-pressed'] = isPressed;
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
  const { icon } = props;
  return (
    <ButtonBase className="IconButton" {...props}>
      <SvgIcon name={icon} />
    </ButtonBase>
  );
}

/**
 * An icon-only button, styled in a compact fashion
 * @param {IconButtonProps} props
 */
export function CompactIconButton(props) {
  const { icon } = props;
  return (
    <ButtonBase className="CompactIconButton" {...props}>
      <SvgIcon name={icon} />
    </ButtonBase>
  );
}

/**
 * A labeled button with no icon
 * @param {ButtonProps} props
 */
export function LabeledButton(props) {
  const { children } = props;
  return (
    <ButtonBase className="LabeledButton" {...props}>
      {children}
    </ButtonBase>
  );
}

/**
 * A button with an icon (default on left) and a label
 * @param {IconButtonProps} props
 */
export function LabeledIconButton(props) {
  const { children, icon, iconPosition = 'left' } = props;
  return (
    <ButtonBase className="LabeledIconButton" {...props}>
      {iconPosition === 'left' && <SvgIcon name={icon} />}
      {children}
      {iconPosition === 'right' && <SvgIcon name={icon} />}
    </ButtonBase>
  );
}

/**
 * A button with an icon (default on left) and a label, styled
 * in a compact fashion
 * @param {IconButtonProps} props
 */
export function CompactLabeledIconButton(props) {
  const { children, icon, iconPosition = 'left' } = props;
  return (
    <ButtonBase className="CompactLabeledIconButton" {...props}>
      {iconPosition === 'left' && <SvgIcon name={icon} />}
      {children}
      {iconPosition === 'right' && <SvgIcon name={icon} />}
    </ButtonBase>
  );
}

/**
 * An icon-only button, styled to pair with a text input field. The button
 * is assumed to be to the right of the text input.
 * @param {IconButtonProps} props
 */
export function IconInputButton(props) {
  const { icon } = props;
  return (
    <ButtonBase className="IconInputButton" {...props}>
      <SvgIcon name={icon} />
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
