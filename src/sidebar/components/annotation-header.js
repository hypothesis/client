'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

const AnnotationDocumentInfo = require('./annotation-document-info');
const AnnotationShareInfo = require('./annotation-share-info');
const AnnotationUser = require('./annotation-user');
const Timestamp = require('./timestamp');

/**
 * Render an annotation's header summary, including metadata about its user,
 * sharing status, document and timestamp. It also allows the user to
 * toggle sub-threads/replies in certain cases.
 */
function AnnotationHeader({
  annotation,
  isEditing,
  isHighlight,
  isPrivate,
  onReplyCountClick,
  replyCount,
  showDocumentInfo,
}) {
  const annotationLink = annotation.links ? annotation.links.html : '';
  const replyPluralized = !replyCount || replyCount > 1 ? 'replies' : 'reply';
  // NB: `created` and `updated` are strings, not `Date`s
  const hasBeenEdited =
    annotation.updated && annotation.created !== annotation.updated;

  return (
    <header className="annotation-header">
      <div className="annotation-header__row">
        <AnnotationUser annotation={annotation} />
        <div className="annotation-collapsed-replies">
          <a className="annotation-link" onClick={onReplyCountClick}>
            {replyCount} {replyPluralized}
          </a>
        </div>
        {!isEditing && annotation.created && (
          <div className="annotation-header__timestamp">
            {hasBeenEdited && (
              <span className="annotation-header__timestamp-edited">
                (edited{' '}
                <Timestamp
                  className="annotation-header__timestamp-edited-link"
                  href={annotationLink}
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
        <AnnotationShareInfo annotation={annotation} isPrivate={isPrivate} />
        {!isEditing && isHighlight && (
          <div className="annotation-header__highlight">
            <i
              className="h-icon-border-color"
              title="This is a highlight. Click 'edit' to add a note or tag."
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
  /* Whether the annotation is a highlight */
  isHighlight: propTypes.bool,
  /* Whether the annotation is an "only me" (private) annotation */
  isPrivate: propTypes.bool,
  /* Callback for when the toggle-replies element is clicked */
  onReplyCountClick: propTypes.func.isRequired,
  /* How many replies this annotation currently has */
  replyCount: propTypes.number,
  /**
   * Should document metadata be rendered? Hint: this is enabled for single-
   * annotation and stream views
   */
  showDocumentInfo: propTypes.bool,
};

module.exports = AnnotationHeader;
