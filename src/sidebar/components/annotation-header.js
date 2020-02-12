import { createElement } from 'preact';
import propTypes from 'prop-types';

import { isHighlight, isReply } from '../util/annotation-metadata';

import AnnotationDocumentInfo from './annotation-document-info';
import AnnotationShareInfo from './annotation-share-info';
import AnnotationUser from './annotation-user';
import Button from './button';
import SvgIcon from './svg-icon';
import Timestamp from './timestamp';

/**
 * Render an annotation's header summary, including metadata about its user,
 * sharing status, document and timestamp. It also allows the user to
 * toggle sub-threads/replies in certain cases.
 */
export default function AnnotationHeader({
  annotation,
  isEditing,
  onReplyCountClick,
  replyCount,
  showDocumentInfo,
  threadIsCollapsed,
}) {
  const annotationLink = annotation.links ? annotation.links.html : '';
  const replyPluralized = !replyCount || replyCount > 1 ? 'replies' : 'reply';
  // NB: `created` and `updated` are strings, not `Date`s
  const hasBeenEdited =
    annotation.updated && annotation.created !== annotation.updated;

  const showReplyButton = threadIsCollapsed && isReply(annotation);
  const replyButtonText = `${replyCount} ${replyPluralized}`;

  return (
    <header className="annotation-header">
      <div className="annotation-header__row">
        <AnnotationUser annotation={annotation} />
        {showReplyButton && (
          <Button
            className="annotation-header__reply-toggle"
            buttonText={replyButtonText}
            onClick={onReplyCountClick}
            title="Expand replies"
          />
        )}
        {!isEditing && annotation.created && (
          <div className="annotation-header__timestamp">
            {hasBeenEdited && (
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
                className="annotation-header__timestamp-created-link"
                href={annotationLink}
                timestamp={annotation.created}
              />
            </span>
          </div>
        )}
      </div>

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
        {showDocumentInfo && <AnnotationDocumentInfo annotation={annotation} />}
      </div>
    </header>
  );
}

AnnotationHeader.propTypes = {
  /* The annotation */
  annotation: propTypes.object.isRequired,
  /* Whether the annotation is actively being edited */
  isEditing: propTypes.bool,
  /* Callback for when the toggle-replies element is clicked */
  onReplyCountClick: propTypes.func.isRequired,
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
