import { SvgIcon } from '@hypothesis/frontend-shared';
import { useMemo } from 'preact/hooks';

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

  // Link (URL) to single-annotation view for this annotation, if it has
  // been provided by the service. Note: this property is not currently
  // present on third-party annotations.
  const annotationUrl = annotation.links?.html || '';

  const showTimestamps = !isEditing && annotation.created;
  const showEditedTimestamp = useMemo(() => {
    return hasBeenEdited(annotation) && !isCollapsedReply;
  }, [annotation, isCollapsedReply]);

  const replyPluralized = replyCount > 1 ? 'replies' : 'reply';
  const replyButtonText = `${replyCount} ${replyPluralized}`;
  const showReplyButton = replyCount > 0 && isCollapsedReply;
  const showExtendedInfo = !isReply(annotation);

  // Pull together some document metadata related to this annotation
  const documentInfo = domainAndTitle(annotation);
  // There are some cases at present in which linking directly to an
  // annotation's document is not immediately feasible—e.g in an LMS context
  // where the original document might not be available outside of an
  // assignment (e.g. Canvas files), and/or wouldn't be able to present
  // any associated annotations.
  // For the present, disable links to annotation documents for all third-party
  // annotations until we have a more nuanced way of making linking determinations.
  // The absence of a link to a single-annotation view is a signal that this
  // is a third-party annotation.
  // Also, of course, verify that there is a URL to the document (titleLink)
  const documentLink =
    annotationUrl && documentInfo.titleLink ? documentInfo.titleLink : '';
  // Show document information on non-sidebar routes, assuming there is a title
  // to show, at the least
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
              annotationCreated={annotation.created}
              annotationUpdated={annotation.updated}
              annotationUrl={annotationUrl}
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
