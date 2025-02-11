import type { Mention } from '../../../types/api';
import type { InvalidUsername } from '../../helpers/mentions';

export type MentionPopoverContent = {
  content: Mention | InvalidUsername;
};

/**
 * Information to display in a Popover when hovering over a processed mention.
 */
export default function MentionPopoverContent({
  content,
}: MentionPopoverContent) {
  if (typeof content === 'string') {
    return (
      <>
        No user with username <span className="font-bold">{content}</span>{' '}
        exists
      </>
    );
  }

  return (
    <div className="flex flex-col gap-y-1.5">
      <div data-testid="username" className="text-md font-bold">
        @{content.username}
      </div>
      {content.display_name && (
        <div data-testid="display-name" className="text-color-text-light">
          {content.display_name}
        </div>
      )}
    </div>
  );
}
