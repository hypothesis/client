import { createElement } from 'preact';
import { useEffect } from 'preact/hooks';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import {
  isHighlight,
  isNew,
  isReply,
  quote,
} from '../util/annotation-metadata';
import { isShared } from '../util/permissions';

import AnnotationActionBar from './annotation-action-bar';
import AnnotationBody from './annotation-body';
import AnnotationHeader from './annotation-header';
import AnnotationLicense from './annotation-license';
import AnnotationPublishControl from './annotation-publish-control';
import AnnotationQuote from './annotation-quote';
import Button from './button';
import TagEditor from './tag-editor';
import TagList from './tag-list';

/**
 * The "new", migrated-to-preact annotation component.
 */
function AnnotationOmega({
  annotation,
  onReplyCountClick,
  replyCount,
  showDocumentInfo,
  threadIsCollapsed,
}) {
  const createDraft = useStore(store => store.createDraft);
  const setCollapsed = useStore(store => store.setCollapsed);

  // An annotation will have a draft if it is being edited
  const draft = useStore(store => store.getDraft(annotation));
  const group = useStore(store => store.getGroup(annotation.group));

  useEffect(() => {
    // TEMPORARY. Create a new draft for new (non-highlight) annotations
    // to put the component in "edit mode."
    if (!draft && isNew(annotation) && !isHighlight(annotation)) {
      createDraft(annotation, {
        tags: annotation.tags,
        text: annotation.text,
        isPrivate: !isShared(annotation.permissions),
      });
    }
  }, [annotation, draft, createDraft]);

  const isPrivate = draft ? draft.isPrivate : !isShared(annotation.permissions);
  const tags = draft ? draft.tags : annotation.tags;
  const text = draft ? draft.text : annotation.text;

  const hasQuote = !!quote(annotation);
  const isEmpty = !text && !tags.length;
  const isSaving = false;
  const isEditing = !!draft && !isSaving;
  const toggleAction = threadIsCollapsed ? 'Show replies' : 'Hide replies';
  const toggleText = `${toggleAction} (${replyCount})`;

  const shouldShowActions = !isEditing && !isNew(annotation);
  const shouldShowLicense = isEditing && !isPrivate && group.type !== 'private';
  const shouldShowThreadToggle = replyCount > 0 && !isReply(annotation);

  const onEditTags = ({ tags }) => {
    createDraft(annotation, { ...draft, tags });
  };

  const onEditText = ({ text }) => {
    createDraft(annotation, { ...draft, text });
  };

  const onToggleThread = () => setCollapsed(annotation.id, !threadIsCollapsed);

  // TODO
  const fakeOnReply = () => alert('Reply: TBD');
  const fakeOnSave = () => alert('Save changes: TBD');

  return (
    <div className="annotation-omega">
      <AnnotationHeader
        annotation={annotation}
        isEditing={isEditing}
        onReplyCountClick={onReplyCountClick}
        replyCount={replyCount}
        showDocumentInfo={showDocumentInfo}
      />
      {hasQuote && <AnnotationQuote annotation={annotation} />}
      <AnnotationBody
        annotation={annotation}
        isEditing={isEditing}
        onEditText={onEditText}
        text={text}
      />
      {isEditing && <TagEditor onEditTags={onEditTags} tagList={tags} />}
      {!isEditing && <TagList annotation={annotation} tags={tags} />}
      <footer className="annotation-footer">
        <div className="annotation-form-actions">
          {isEditing && (
            <AnnotationPublishControl
              annotation={annotation}
              isDisabled={isEmpty}
              onSave={fakeOnSave}
            />
          )}
        </div>
        {shouldShowLicense && <AnnotationLicense />}
        <div className="annotation-omega__controls">
          {shouldShowThreadToggle && (
            <Button
              buttonText={toggleText}
              className="annotation-omega__reply-toggle"
              onClick={onToggleThread}
            />
          )}
          {shouldShowActions && (
            <div className="annotation-omega-actions">
              <AnnotationActionBar
                annotation={annotation}
                onReply={fakeOnReply}
              />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

AnnotationOmega.propTypes = {
  annotation: propTypes.object.isRequired,

  /** Callback for reply-count clicks */
  onReplyCountClick: propTypes.func.isRequired,
  /** Number of replies to this annotation (thread) */
  replyCount: propTypes.number.isRequired,
  /** Should extended document info be rendered (e.g. in non-sidebar contexts)? */
  showDocumentInfo: propTypes.bool.isRequired,
  /** Is the thread to which this annotation belongs currently collapsed? */
  threadIsCollapsed: propTypes.bool.isRequired,
};

export default AnnotationOmega;
