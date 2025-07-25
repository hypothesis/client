import type { ModerationStatus } from '@hypothesis/annotation-ui';
import { moderationStatusInfo } from '@hypothesis/annotation-ui';
import { Button, Popover } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useRef, useState } from 'preact/hooks';

export type ModerationStatusBadgeProps = {
  status: ModerationStatus;
  classes?: string | string[];
};

/**
 * Badge representation of a moderation status, with the corresponding color
 * palette, icon and text
 */
export default function ModerationStatusBadge({
  status,
  classes,
}: ModerationStatusBadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const badgeRef = useRef<HTMLButtonElement | null>(null);

  // We only support these two moderation statuses for now
  if (!['PENDING', 'DENIED'].includes(status)) {
    return null;
  }

  const { icon: Icon, label } = moderationStatusInfo[status]!;
  let popoverMessage = '';
  if (status === 'PENDING') {
    popoverMessage =
      'Not visible to other users yet. Waiting for a moderator to review it.';
  } else if (status === 'DENIED') {
    popoverMessage =
      'Not visible to other users. Edit this annotation to resubmit it for moderator approval.';
  }

  return (
    <div className="relative" data-testid="moderation-status-badge">
      <Button
        variant="custom"
        elementRef={badgeRef}
        classes={classnames(
          'px-1.5 py-1 rounded flex items-center gap-1.5',
          {
            'bg-grey-2 text-black': status === 'PENDING',
            'bg-red-light text-red-dark': status === 'DENIED',
          },
          classes,
        )}
        onClick={() => setPopoverOpen(true)}
      >
        <Icon className={classnames(status === 'PENDING' && 'text-grey-7')} />
        {label}
      </Button>
      <Popover
        open={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        anchorElementRef={badgeRef}
        placement="above"
        classes="!bg-grey-9 !border-grey-9 text-white px-2.5 py-2"
      >
        {popoverMessage}
      </Popover>
    </div>
  );
}
