import {
  EditIcon,
  FlagFilledIcon,
  FlagIcon,
  IconButton,
  ReplyIcon,
  TrashIcon,
} from '@hypothesis/frontend-shared';

import { useAnnotationContext } from '../helpers/AnnotationContext';
import { annotationSharingLink } from '../helpers/annotation-sharing';
import type { Annotation } from '../helpers/types';
import AnnotationShareControl from './AnnotationShareControl';

export type AnnotationActionBarProps = {
  annotation: Annotation;
  onStartEdit: () => void;
};

/**
 * A collection of buttons in the footer area of an annotation that take
 * actions on the annotation.
 *
 * @param {AnnotationActionBarProps} props
 */
export default function AnnotationActionBar({
  annotation,
  onStartEdit,
}: AnnotationActionBarProps) {
  const { events, flaggingEnabled, sharingEnabled } = useAnnotationContext();
  const shareLink = sharingEnabled && annotationSharingLink(annotation);

  return (
    <div className="flex text-[16px]" data-testid="annotation-action-bar">
      {events?.onSave && (
        <IconButton icon={EditIcon} title="Edit" onClick={onStartEdit} />
      )}
      {events?.onDelete && (
        <IconButton
          icon={TrashIcon}
          title="Delete"
          onClick={events?.onDelete}
        />
      )}
      <IconButton icon={ReplyIcon} title="Reply" onClick={events?.onReply} />
      {shareLink && (
        <AnnotationShareControl annotation={annotation} shareUri={shareLink} />
      )}
      {flaggingEnabled && !annotation.flagged && (
        <IconButton
          icon={FlagIcon}
          title="Report this annotation to moderators"
          onClick={events?.onFlag}
        />
      )}
      {flaggingEnabled && annotation.flagged && (
        <IconButton
          pressed={true}
          icon={FlagFilledIcon}
          title="Annotation has been reported to the moderators"
        />
      )}
    </div>
  );
}
