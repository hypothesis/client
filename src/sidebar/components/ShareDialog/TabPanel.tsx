import { CardTitle } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { ComponentChildren, JSX } from 'preact';

export type TabPanelProps = {
  active?: boolean;
  title?: ComponentChildren;
} & JSX.HTMLAttributes<HTMLDivElement>;

/**
 * Render a `role="tabpanel"` element within a Card layout. It will be
 *  hidden unless `active`.
 */
export default function TabPanel({
  children,
  active,
  title,
  ...htmlAttributes
}: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      {...htmlAttributes}
      className={classnames('p-3 focus-visible-ring ring-inset', {
        hidden: !active,
      })}
      hidden={!active}
    >
      {title && <CardTitle>{title}</CardTitle>}
      <div className="space-y-3 pt-2">{children}</div>
    </div>
  );
}
