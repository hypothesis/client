import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { normalizeKeyName } from '../../shared/browser-compatibility-utils';
import useStore from '../store/use-store';
import { isReply, quote } from '../util/annotation-metadata';
import { isShared } from '../util/permissions';
import { withServices } from '../util/service-context';

import AnnotationActionBar from './annotation-action-bar';
import AnnotationBody from './annotation-body';
import AnnotationHeader from './annotation-header';
import AnnotationLicense from './annotation-license';
import AnnotationPublishControl from './annotation-publish-control';
import AnnotationQuote from './annotation-quote';
import Button from './button';

/**
 * A single annotation.
 */
function Annotation({
  annotation,
  annotationsService,
  replyCount,
  showDocumentInfo,
  threadIsCollapsed,
  toastMessenger,
}) {
  const createDraft = useStore(store => store.createDraft);
  const isFocused = useStore(store =>
    store.isAnnotationFocused(annotation.$tag)
  );
  const setExpanded = useStore(store => store.setExpanded);

  // An annotation will have a draft if it is being edited
  const draft = useStore(store => store.getDraft(annotation));
  const group = useStore(store => store.getGroup(annotation.group));
  const userid = useStore(store => store.profile().userid);
  const isSaving = useStore(store => store.isSavingAnnotation(annotation));

  const isCollapsedReply = isReply(annotation) && threadIsCollapsed;
  const isPrivate = draft ? draft.isPrivate : !isShared(annotation.permissions);
  const tags = draft ? draft.tags : annotation.tags;
  const text = draft ? draft.text : annotation.text;

  const hasQuote = !!quote(annotation);
  const isEmpty = !text && !tags.length;

  const isEditing = !!draft && !isSaving;

  const toggleAction = threadIsCollapsed ? 'Show replies' : 'Hide replies';
  const toggleText = `${toggleAction} (${replyCount})`;

  const shouldShowActions = !isSaving && !isEditing;
  const shouldShowLicense =
    isEditing && !isPrivate && group && group.type !== 'private';
  const shouldShowReplyToggle = replyCount > 0 && !isReply(annotation);

  const onEditTags = ({ tags }) => {
    createDraft(annotation, { ...draft, tags });
  };

  const onEditText = ({ text }) => {
    createDraft(annotation, { ...draft, text });
  };

  const onReply = () => annotationsService.reply(annotation, userid);

  const onSave = async () => {
    try {
      await annotationsService.save(annotation);
    } catch (err) {
      toastMessenger.error('Saving annotation failed');
    }
  };

  // Allow saving of annotation by pressing CMD/CTRL-Enter
  const onKeyDown = event => {
    const key = normalizeKeyName(event.key);
    if (isEmpty || !isEditing) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && key === 'Enter') {
      event.stopPropagation();
      event.preventDefault();
      onSave();
    }
  };

  const onToggleReplies = () => setExpanded(annotation.id, !!threadIsCollapsed);

  return (
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */
    <article
      className={classnames('annotation', {
        'annotation--reply': isReply(annotation),
        'is-collapsed': threadIsCollapsed,
        'is-focused': isFocused,
      })}
      onKeyDown={onKeyDown}
    >
      <AnnotationHeader
        annotation={annotation}
        isEditing={isEditing}
        replyCount={replyCount}
        showDocumentInfo={showDocumentInfo}
        threadIsCollapsed={threadIsCollapsed}
      />

      {hasQuote && (
        <AnnotationQuote annotation={annotation} isFocused={isFocused} />
      )}

      {!isCollapsedReply && (
        <AnnotationBody
          annotation={annotation}
          isEditing={isEditing}
          onEditTags={onEditTags}
          onEditText={onEditText}
          tags={tags}
          text={text}
        />
      )}

      {isEditing && (
        <div className="annotation__form-actions u-layout-row">
          <AnnotationPublishControl
            annotation={annotation}
            isDisabled={isEmpty}
            onSave={onSave}
          />
        </div>
      )}
      {shouldShowLicense && <AnnotationLicense />}

      {!isCollapsedReply && (
        <footer className="annotation__footer">
          <div className="annotation__controls u-layout-row">
            {shouldShowReplyToggle && (
              <Button
                className="annotation__reply-toggle"
                onClick={onToggleReplies}
                buttonText={toggleText}
              />
            )}
            {isSaving && <div className="annotation__actions">Saving...</div>}
            {shouldShowActions && (
              <div className="annotation__actions">
                <AnnotationActionBar
                  annotation={annotation}
                  onReply={onReply}
                />
              </div>
            )}
          </div>
        </footer>
      )}
    </article>
  );
}

Annotation.propTypes = {
  annotation: propTypes.object.isRequired,

  /** Number of replies to this annotation (thread) */
  replyCount: propTypes.number.isRequired,
  /** Should extended document info be rendered (e.g. in non-sidebar contexts)? */
  showDocumentInfo: propTypes.bool.isRequired,
  /** Is the thread to which this annotation belongs currently collapsed? */
  threadIsCollapsed: propTypes.bool.isRequired,

  /* Injected services */
  annotationsService: propTypes.object.isRequired,
  toastMessenger: propTypes.object.isRequired,
};

Annotation.injectedProps = ['annotationsService', 'toastMessenger'];

export default withServices(Annotation);
