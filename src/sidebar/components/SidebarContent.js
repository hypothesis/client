import classnames from 'classnames';

import { downcastRef } from '../util/typing';

/**
 * @typedef {import('../../types/sidebar').PresentationalDivComponentProps} SidebarContentProps
 */

/**
 * Render "page"-like content in a container that centers it and constrains
 * it to a maximum content width.
 *
 * @param {SidebarContentProps} props
 */
export default function SidebarContent({
  children,
  classes,
  elementRef,
  ...restProps
}) {
  return (
    <div
      className={classnames(
        // Center this content (auto margins). For larger viewports, set a
        // maximum width (768px) and add some horizontal padding.
        'mx-auto lg:px-16 lg:max-w-3xl',
        classes
      )}
      {...restProps}
      ref={downcastRef(elementRef)}
    >
      {children}
    </div>
  );
}
