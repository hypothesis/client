import { ModerationStatusSelect } from '@hypothesis/annotation-ui';

import type { Annotation } from '../../../types/api';
import ModerationStatusBadge from './ModerationStatusBadge';

export type ModerationControlProps = {
  annotation: Annotation;
  groupIsPreModerated: boolean;
  /** Classes to apply to the ModerationStatusBadge in case it's rendered */
  badgeClasses?: string | string[];
};

export default function ModerationControl({
  annotation,
  groupIsPreModerated,
  badgeClasses,
}: ModerationControlProps) {
  const canModerate = annotation.actions?.includes('moderate');
  const moderationStatus = annotation?.moderation_status ?? 'APPROVED';

  // We don't want to show any moderation control for approved annotations in
  // non-pre-moderated groups, to avoid cluttering the UI, since most,
  // annotations will have `APPROVED` status.
  if (!groupIsPreModerated && moderationStatus === 'APPROVED') {
    return null;
  }

  return canModerate ? (
    <ModerationStatusSelect
      mode="select"
      selected={moderationStatus}
      /* TODO Implement logic to change the status */
      onChange={/* istanbul ignore next */ () => {}}
      alignListbox="left"
    />
  ) : (
    <ModerationStatusBadge status={moderationStatus} classes={badgeClasses} />
  );
}
