import { ModerationStatusSelect } from '@hypothesis/annotation-ui';

import type { Annotation } from '../../../types/api';
import ModerationStatusBadge from './ModerationStatusBadge';

export type ModerationControlProps = {
  annotation: Annotation;
  groupIsPreModerated: boolean;
  /** Classes to apply to the ModerationStatusBadge in case it's rendered */
  badgeClasses?: string | string[];
};

/**
 * Render the proper moderation control/s for provided annotation.
 *
 * - ModerationStatusSelect for moderators of pre-moderated groups.
 * - ModerationStatusBadge for own annotations in any group
 */
export default function ModerationControl({
  annotation,
  groupIsPreModerated,
  badgeClasses,
}: ModerationControlProps) {
  const canModerate = annotation.actions?.includes('moderate');

  // We want to show moderation controls only if current user is a moderator or
  // the annotation's author
  const moderationStatus = annotation?.moderation_status ?? 'APPROVED';

  if (!canModerate && moderationStatus === 'APPROVED') {
    return null;
  }

  // We don't want to show moderation selects to moderators of non-pre-moderated
  // groups, to avoid cluttering the UI with all the extra controls, since most
  // annotations will have `APPROVED` status.
  return canModerate && groupIsPreModerated ? (
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
