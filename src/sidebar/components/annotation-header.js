import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { isHighlight, isReply } from '../util/annotation-metadata';
import { isPrivate } from '../util/permissions';

import AnnotationDocumentInfo from './annotation-document-info';
import AnnotationShareInfo from './annotation-share-info';
import AnnotationUser from './annotation-user';
import Button from './button';
import SvgIcon from '../../shared/components/svg-icon';
import Timestamp from './timestamp';

/**
 * Render an annotation's header summary, including metadata about its user,
 * sharing status, document and timestamp. It also allows the user to
 * toggle sub-threads/replies in certain cases.
 */
export default function AnnotationHeader({
  annotation,
  isEditing,
  replyCount,
  showDocumentInfo,
  threadIsCollapsed,
}) {
  const isCollapsedReply = isReply(annotation) && threadIsCollapsed;
  const setExpanded = useStore(store => store.setExpanded);

  const annotationIsPrivate = isPrivate(annotation.permissions);
  const annotationLink = annotation.links ? annotation.links.html : '';

  // NB: `created` and `updated` are strings, not `Date`s
  const hasBeenEdited =
    annotation.updated && annotation.created !== annotation.updated;
  const showTimestamp = !isEditing && annotation.created;
  const showEditedTimestamp = hasBeenEdited && !isCollapsedReply;

  const replyPluralized = replyCount > 1 ? 'replies' : 'reply';
  const replyButtonText = `${replyCount} ${replyPluralized}`;
  const showReplyButton = replyCount > 0 && isCollapsedReply;
  const showExtendedInfo = !isReply(annotation);

  const onReplyCountClick = () => setExpanded(annotation.id, true);

  return (
    <header className="annotation-header">
      <div className="annotation-header__row">
        {annotationIsPrivate && !isEditing && (
          <SvgIcon
            className="annotation-header__icon"
            name="lock"
            title="This annotation is visible only to you"
          />
        )}
        <AnnotationUser annotation={annotation} />
        {showReplyButton && (
          <Button
            className="annotation-header__reply-toggle"
            buttonText={replyButtonText}
            onClick={onReplyCountClick}
            title="Expand replies"
          />
        )}

        {showTimestamp && (
          <div className="annotation-header__timestamp">
            {showEditedTimestamp && (
              <span className="annotation-header__timestamp-edited">
                (edited{' '}
                <Timestamp
                  className="annotation-header__timestamp-edited-link"
                  timestamp={annotation.updated}
                />
                ){' '}
              </span>
            )}
            <span className="annotation-header__timestamp-created">
              <Timestamp
                className="annotation-header__timestamp-created-link u-color-text--muted"
                href={annotationLink}
                timestamp={annotation.created}
              />
            </span>
          </div>
        )}
      </div>

      {showExtendedInfo && (
        <div className="annotation-header__row">
          <AnnotationShareInfo annotation={annotation} />
          {!isEditing && isHighlight(annotation) && (
            <div className="annotation-header__highlight">
              <SvgIcon
                name="highlight"
                title="This is a highlight. Click 'edit' to add a note or tag."
                inline={true}
                className="annotation-header__highlight-icon"
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
  /* The annotation */
  annotation: propTypes.object.isRequired,
  /* Whether the annotation is actively being edited */
  isEditing: propTypes.bool,
  /* How many replies this annotation currently has */
  replyCount: propTypes.number,
  /**
   * Should document metadata be rendered? Hint: this is enabled for single-
   * annotation and stream views
   */
  showDocumentInfo: propTypes.bool,
  /**
   * Is this thread currently collapsed?
   */
  threadIsCollapsed: propTypes.bool.isRequired,
};
