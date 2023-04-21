import classnames from 'classnames';
import type { JSX, ComponentChildren, Ref } from 'preact';

import { downcastRef } from './type-coercions';

type HTMLDivAttributes = JSX.HTMLAttributes<HTMLDivElement>;

export type PresentationalComponentProps = {
  children?: ComponentChildren;
  /** Optional extra CSS classes to append to the component's default classes */
  classes?: string | string[];
  elementRef?: Ref<HTMLElement>;
};

/**
 * Make a presentational component which wraps children to apply layout and
 * styling.
 *
 * @param classes - CSS classes for this component
 */
export function makePresentationalComponent(
  displayName: string,
  classes: string | string[]
) {
  function PresentationalComponent({
    classes: extraClasses,
    elementRef,
    children,
    ...htmlAttributes
  }: HTMLDivAttributes & PresentationalComponentProps) {
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
