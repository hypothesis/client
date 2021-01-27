import { createElement } from 'preact';
import { useMemo } from 'preact/hooks';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import {
  isHighlight,
  isReply,
  hasBeenEdited,
} from '../helpers/annotation-metadata';
import { isPrivate } from '../helpers/permissions';

import AnnotationDocumentInfo from './AnnotationDocumentInfo';
import AnnotationShareInfo from './AnnotationShareInfo';
import AnnotationUser from './AnnotationUser';
import Button from './Button';
import SvgIcon from '../../shared/components/svg-icon';
import AnnotationTimestamps from './AnnotationTimestamps';

/**
 * @typedef {import("../../types/api").Annotation} Annotation
 */

/**
 * @typedef AnnotationHeaderProps
 * @prop {Annotation} annotation
 * @prop {boolean} [isEditing] - Whether the annotation is actively being edited
 * @prop {number} replyCount - How many replies this annotation currently has
 * @prop {boolean} [showDocumentInfo] -
 *   Should document metadata be rendered? Hint: this is enabled for single annotation
 *   and stream views.
 * @prop {boolean} threadIsCollapsed - Is this thread currently collapsed?
 */

/**
 * Render an annotation's header summary, including metadata about its user,
 * sharing status, document and timestamp. It also allows the user to
 * toggle sub-threads/replies in certain cases.
 *
 * @param {AnnotationHeaderProps} props
 */
export default function AnnotationHeader({
  annotation,
  isEditing,
  replyCount,
  showDocumentInfo,
  threadIsCollapsed,
}) {
  const store = useStoreProxy();
  const isCollapsedReply = isReply(annotation) && threadIsCollapsed;

  const annotationIsPrivate = isPrivate(annotation.permissions);

  const showTimestamps = !isEditing && annotation.created;
  const showEditedTimestamp = useMemo(() => {
    return hasBeenEdited(annotation) && !isCollapsedReply;
  }, [annotation, isCollapsedReply]);

  const replyPluralized = replyCount > 1 ? 'replies' : 'reply';
  const replyButtonText = `${replyCount} ${replyPluralized}`;
  const showReplyButton = replyCount > 0 && isCollapsedReply;
  const showExtendedInfo = !isReply(annotation);

  const onReplyCountClick = () =>
    // If an annotation has replies it must have been saved and therefore have
    // an ID.
    store.setExpanded(/** @type {string} */ (annotation.id), true);

  return (
    <header className="AnnotationHeader">
      <div className="AnnotationHeader__row">
        {annotationIsPrivate && !isEditing && (
          <SvgIcon
            className="AnnotationHeader__icon"
            name="lock"
            title="This annotation is visible only to you"
          />
        )}
        <AnnotationUser annotation={annotation} />
        {showReplyButton && (
          <Button
            className="AnnotationHeader__reply-toggle"
            buttonText={replyButtonText}
            onClick={onReplyCountClick}
            title="Expand replies"
          />
        )}

        {showTimestamps && (
          <div className="AnnotationHeader__timestamps">
            <AnnotationTimestamps
              annotation={annotation}
              withEditedTimestamp={showEditedTimestamp}
            />
          </div>
        )}
      </div>

      {showExtendedInfo && (
        <div className="AnnotationHeader__row">
          <AnnotationShareInfo annotation={annotation} />
          {!isEditing && isHighlight(annotation) && (
            <div className="AnnotationHeader__highlight">
              <SvgIcon
                name="highlight"
                title="This is a highlight. Click 'edit' to add a note or tag."
                inline={true}
                className="AnnotationHeader__highlight-icon"
              />
            </div>
          )}
          {showDocumentInfo && (
            <AnnotationDocumentInfo annotation={annotation} />
          )}
        </div>
      )}
    </header>
  );
}

AnnotationHeader.propTypes = {
  annotation: propTypes.object.isRequired,
  isEditing: propTypes.bool,
  replyCount: propTypes.number,
  showDocumentInfo: propTypes.bool,
  threadIsCollapsed: propTypes.bool.isRequired,
};
