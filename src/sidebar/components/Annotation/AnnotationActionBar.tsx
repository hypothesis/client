import {
  IconButton,
  EditIcon,
  FlagIcon,
  FlagFilledIcon,
  ReplyIcon,
  TrashIcon,
} from '@hypothesis/frontend-shared/lib/next';

import { confirm } from '../../../shared/prompts';
import type { SavedAnnotation } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import { serviceConfig } from '../../config/service-config';
import { annotationRole } from '../../helpers/annotation-metadata';
import {
  sharingEnabled,
  annotationSharingLink,
} from '../../helpers/annotation-sharing';
import { isPrivate, permits } from '../../helpers/permissions';
import { withServices } from '../../service-context';
import type { AnnotationsService } from '../../services/annotations';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import AnnotationShareControl from './AnnotationShareControl';

function flaggingEnabled(settings: SidebarSettings) {
  const service = serviceConfig(settings);
  if (service?.allowFlagging === false) {
    return false;
  }
  return true;
}

export type AnnotationActionBarProps = {
  annotation: SavedAnnotation;
  onReply: () => void;

  // injected
  annotationsService: AnnotationsService;
  settings: SidebarSettings;
  toastMessenger: ToastMessengerService;
};

/**
 * A collection of buttons in the footer area of an annotation that take
 * actions on the annotation.
 *
 * @param {AnnotationActionBarProps} props
 */
function AnnotationActionBar({
  annotation,
  annotationsService,
  onReply,
  settings,
  toastMessenger,
}: AnnotationActionBarProps) {
  const store = useSidebarStore();
  const userProfile = store.profile();
  const isLoggedIn = store.isLoggedIn();

  // Is the current user allowed to take the given `action` on this annotation?
  const userIsAuthorizedTo = (action: 'update' | 'delete') => {
    return permits(annotation.permissions, action, userProfile.userid);
  };

  const showDeleteAction = userIsAuthorizedTo('delete');
  const showEditAction = userIsAuthorizedTo('update');

  //  Only authenticated users can flag an annotation, except the annotation's author.
  const showFlagAction =
    flaggingEnabled(settings) &&
    !!userProfile.userid &&
    userProfile.userid !== annotation.user;

  const shareLink =
    sharingEnabled(settings) && annotationSharingLink(annotation);

  const onDelete = async () => {
    const annType = annotationRole(annotation);
    if (
      await confirm({
        title: `Delete ${annType.toLowerCase()}?`,
        message: `Are you sure you want to delete this ${annType.toLowerCase()}?`,
        confirmAction: 'Delete',
      })
    ) {
      try {
        await annotationsService.delete(annotation);
        toastMessenger.success(`${annType} deleted`, { visuallyHidden: true });
      } catch (err) {
        toastMessenger.error(err.message);
      }
    }
  };

  const onEdit = () => {
    store.createDraft(annotation, {
      tags: annotation.tags,
      text: annotation.text,
      isPrivate: isPrivate(annotation.permissions),
    });
  };

  const onFlag = () => {
    annotationsService
      .flag(annotation)
      .catch(() => toastMessenger.error('Flagging annotation failed'));
  };

  const onReplyClick = () => {
    if (!isLoggedIn) {
      store.openSidebarPanel('loginPrompt');
      return;
    }
    onReply();
  };

  return (
    <div className="flex text-[16px]" data-testid="annotation-action-bar">
      {showEditAction && (
        <IconButton icon={EditIcon} title="Edit" onClick={onEdit} />
      )}
      {showDeleteAction && (
        <IconButton icon={TrashIcon} title="Delete" onClick={onDelete} />
      )}
      <IconButton icon={ReplyIcon} title="Reply" onClick={onReplyClick} />
      {shareLink && (
        <AnnotationShareControl annotation={annotation} shareUri={shareLink} />
      )}
      {showFlagAction && !annotation.flagged && (
        <IconButton
          icon={FlagIcon}
          title="Report this annotation to moderators"
          onClick={onFlag}
        />
      )}
      {showFlagAction && annotation.flagged && (
        <IconButton
          pressed={true}
          icon={FlagFilledIcon}
          title="Annotation has been reported to the moderators"
        />
      )}
    </div>
  );
}

export default withServices(AnnotationActionBar, [
  'annotationsService',
  'settings',
  'toastMessenger',
]);
