import { CloseButton, TabList } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { ComponentChildren } from 'preact';

/**
 * Render a header to go above a Card, with contents in a TabList
 */
export default function TabHeader({
  children,
}: {
  children: ComponentChildren;
}) {
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
          'text-grey-6 hover:text-grey-7 hover:bg-grey-3/50'
        )}
        title="Close"
        variant="custom"
        size="sm"
      />
      <TabList classes="grow gap-x-1 -mb-[1px] z-2">{children}</TabList>
    </div>
  );
}
