import { SvgIcon } from '@hypothesis/frontend-shared';
import { useMemo } from 'preact/hooks';
import propTypes from 'prop-types';

import { useStoreProxy } from '../../store/use-store';
import {
  domainAndTitle,
  isHighlight,
  isReply,
  hasBeenEdited,
} from '../../helpers/annotation-metadata';
import { isPrivate } from '../../helpers/permissions';

import Button from '../Button';

import AnnotationDocumentInfo from './AnnotationDocumentInfo';
import AnnotationShareInfo from './AnnotationShareInfo';
import AnnotationTimestamps from './AnnotationTimestamps';
import AnnotationUser from './AnnotationUser';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 */

/**
 * @typedef AnnotationHeaderProps
 * @prop {Annotation} annotation
 * @prop {boolean} [isEditing] - Whether the annotation is actively being edited
 * @prop {number} replyCount - How many replies this annotation currently has
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

  const annotationUrl = annotation.links?.html || '';
  const documentInfo = domainAndTitle(annotation);
  const documentLink =
    annotationUrl && documentInfo.titleLink ? documentInfo.titleLink : '';
  const showDocumentInfo =
    store.route() !== 'sidebar' && documentInfo.titleText;

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
            <AnnotationDocumentInfo
              domain={documentInfo.domain}
              link={documentLink}
              title={documentInfo.titleText}
            />
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
  threadIsCollapsed: propTypes.bool.isRequired,
};
