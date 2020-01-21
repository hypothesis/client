import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { quote } from '../util/annotation-metadata';

import AnnotationBody from './annotation-body';
import AnnotationHeader from './annotation-header';
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

  // An annotation will have a draft if it is being edited
  const draft = useStore(store => store.getDraft(annotation));
  const tags = draft ? draft.tags : annotation.tags;
  const text = draft ? draft.text : annotation.text;

  const hasQuote = !!quote(annotation);
  const isSaving = false;
  const isEditing = !!draft && !isSaving;

  const onEditTags = ({ tags }) => {
    createDraft(annotation, { ...draft, tags });
  };

  const onEditText = ({ text }) => {
    createDraft(annotation, { ...draft, text });
  };

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
