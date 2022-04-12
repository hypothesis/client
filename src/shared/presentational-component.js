import classnames from 'classnames';

import { downcastRef } from './type-coercions';

/**
 * @typedef {import('preact').JSX.HTMLAttributes<HTMLDivElement>} HTMLDivAttributes
 */

/**
 * @typedef PresentationalComponentProps
 * @prop {import('preact').ComponentChildren} [children]
 * @prop {string|string[]} [classes] - Optional extra CSS classes to append to the
 *   component's default classes
 * @prop {import('preact').Ref<HTMLElement>} [elementRef]
 */

/**
 * Make a presentational component which wraps children to apply layout and
 * styling.
 *
 * @param {string} displayName
 * @param {string|string[]} classes - CSS classes for this component
 */
export function makePresentationalComponent(displayName, classes) {
  /**
   * @param {HTMLDivAttributes & PresentationalComponentProps} props
   */
  function PresentationalComponent({
    classes: extraClasses,
    elementRef,
    children,
    ...htmlAttributes
  }) {
    return (
      <div
        className={classnames(classes, extraClasses)}
        ref={downcastRef(elementRef)}
        {...htmlAttributes}
      >
        {children}
      </div>
    );
  }
  PresentationalComponent.displayName = displayName;
  return PresentationalComponent;
}
