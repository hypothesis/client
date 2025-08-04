import type { ModerationStatus } from '@hypothesis/annotation-ui';
import { ModerationStatusSelect } from '@hypothesis/annotation-ui';
import { useCallback, useState } from 'preact/hooks';

import type { SavedAnnotation } from '../../../types/api';
import { withServices } from '../../service-context';
import type { AnnotationsService } from '../../services/annotations';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { FetchError } from '../../util/fetch';
import ModerationStatusBadge from './ModerationStatusBadge';

export type ModerationControlProps = {
  annotation: SavedAnnotation;
  groupIsPreModerated: boolean;
  /** Classes to apply to the ModerationStatusBadge in case it's rendered */
  badgeClasses?: string | string[];

  // Injected
  annotationsService: AnnotationsService;
  toastMessenger: ToastMessengerService;
};

function ModerationControl({
  annotation,
  groupIsPreModerated,
  badgeClasses,
  annotationsService,
  toastMessenger,
}: ModerationControlProps) {
  const canModerate = annotation.actions?.includes('moderate');
  const moderationStatus = annotation?.moderation_status ?? 'APPROVED';
  const [changingStatus, setChangingStatus] = useState(false);
  const changeModerationStatus = useCallback(
    async (newStatus: ModerationStatus) => {
      setChangingStatus(true);
      try {
        await annotationsService.moderate(annotation, newStatus);
      } catch (e) {
        const isConflictError =
          e instanceof FetchError && e.response?.status === 409;

        if (isConflictError) {
          toastMessenger.notice(
            'The annotation has been updated since this page was loaded',
            { autoDismiss: false },
          );
        } else {
          toastMessenger.error(
            'An error occurred updating the moderation status',
          );
        }
      } finally {
        setChangingStatus(false);
      }
    },
    [annotation, annotationsService, toastMessenger],
  );

  // We don't want to show any moderation control for approved annotations in
  // non-pre-moderated groups, to avoid cluttering the UI, since most,
  // annotations will have `APPROVED` status.
  if (!groupIsPreModerated && moderationStatus === 'APPROVED') {
    return null;
  }

  return canModerate ? (
    <ModerationStatusSelect
      mode="select"
      alignListbox="left"
      selected={moderationStatus}
      onChange={changeModerationStatus}
      disabled={changingStatus}
    />
  ) : (
    <ModerationStatusBadge status={moderationStatus} classes={badgeClasses} />
  );
}

export default withServices(ModerationControl, [
  'annotationsService',
  'toastMessenger',
]);
