import { moderationStatusInfo } from '@hypothesis/annotation-ui';
import classnames from 'classnames';

import type { ModerationStatus } from '../../../types/api';

export type ModerationStatusBadgeProps = {
  status: ModerationStatus;
  classes?: string | string[];
};

/**
 * Badge representation of a moderation status, with the corresponding color
 * palette and icon
 */
export default function ModerationStatusBadge({
  status,
  classes,
}: ModerationStatusBadgeProps) {
  // We only support these two moderation statuses for now
  if (!['PENDING', 'DENIED'].includes(status)) {
    return null;
  }

  const { icon: Icon, label } = moderationStatusInfo[status]!;

  return (
    <span
      className={classnames(
        'px-1.5 py-1 rounded inline-flex items-center gap-1.5',
        {
          'bg-grey-2 text-black': status === 'PENDING',
          'bg-red-light text-red-dark': status === 'DENIED',
        },
        classes,
      )}
    >
      <Icon className={classnames(status === 'PENDING' && 'text-grey-7')} />
      {label}
    </span>
  );
}
