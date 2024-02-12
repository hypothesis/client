import { CloseButton, TabList } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { ComponentChildren } from 'preact';

export type TabHeaderProps = {
  children: ComponentChildren;
  /** Title for the close button. */
  closeTitle: string;
};

/**
 * Render a header to go above a Card, with contents in a TabList
 */
export default function TabHeader({ children, closeTitle }: TabHeaderProps) {
  return (
    <div data-testid="tab-header" className="flex items-center">
      <CloseButton
        classes={classnames(
          // This element comes first in source order before tabs, but is
          // positioned last. This puts this button earlier in the tab
          // sequence than the tabs, allowing tabs to be immediately adjacent
          // to their controlled tab panels/tab content in the tab sequence.
          'order-last',
          // Always render this button at 16px square regardless of parent
          // font size
          'text-[16px]',
          'text-grey-6 hover:text-grey-7 hover:bg-grey-3/50',

          // Keep the close button the same height on touch devices.
          //
          // This is needed so that the close button remains the same height as
          // the `Tab` components rendered inside the `TabList`. See issue #6131.
          'touch:!min-h-0',
        )}
        title={closeTitle}
        variant="custom"
        size="sm"
      />
      <TabList classes="grow gap-x-1 -mb-[1px] z-2">{children}</TabList>
    </div>
  );
}
