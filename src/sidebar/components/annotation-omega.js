import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { isNew, isReply, quote } from '../util/annotation-metadata';
import { isShared } from '../util/permissions';

import AnnotationActionBar from './annotation-action-bar';
import AnnotationBody from './annotation-body';
import AnnotationHeader from './annotation-header';
import AnnotationLicense from './annotation-license';
import AnnotationPublishControl from './annotation-publish-control';
import AnnotationQuote from './annotation-quote';
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
}) {
  const createDraft = useStore(store => store.createDraft);
  const setDefault = useStore(store => store.setDefault);

  // An annotation will have a draft if it is being edited
  const draft = useStore(store => store.getDraft(annotation));
  const group = useStore(store => store.getGroup(annotation.group));

  const isPrivate = draft ? draft.isPrivate : !isShared(annotation.permissions);
  const tags = draft ? draft.tags : annotation.tags;
  const text = draft ? draft.text : annotation.text;

  const hasQuote = !!quote(annotation);
  const isEmpty = !text && !tags.length;
  const isSaving = false;
  const isEditing = !!draft && !isSaving;

  const shouldShowActions = !isEditing && !isNew(annotation);
  const shouldShowLicense = isEditing && !isPrivate && group.type !== 'private';

  const onEditTags = ({ tags }) => {
    createDraft(annotation, { ...draft, tags });
  };

  const onEditText = ({ text }) => {
    createDraft(annotation, { ...draft, text });
  };

  const onSetPrivacy = ({ level }) => {
    createDraft(annotation, { ...draft, isPrivate: level === 'private' });
    // Persist this as privacy default for future annotations unless this is a reply
    if (!isReply(annotation)) {
      setDefault('annotationPrivacy', level);
    }
  };

  // TODO
  const fakeOnReply = () => alert('Reply: TBD');
  const fakeOnRevert = () => alert('Revert changes: TBD');
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
        {isEditing && (
          <AnnotationPublishControl
            group={group}
            isDisabled={isEmpty}
            isShared={!isPrivate}
            onCancel={fakeOnRevert}
            onSave={fakeOnSave}
            onSetPrivacy={onSetPrivacy}
          />
        )}
        {shouldShowLicense && <AnnotationLicense />}
        {shouldShowActions && (
          <div className="annotation-actions">
            <AnnotationActionBar
              annotation={annotation}
              onReply={fakeOnReply}
            />
          </div>
        )}
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
};

export default AnnotationOmega;
