import { createElement } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import { isHighlight, isNew, quote } from '../util/annotation-metadata';
import { isShared } from '../util/permissions';
import { withServices } from '../util/service-context';

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
  annotationsService,
  flash,
  onReplyCountClick,
  replyCount,
  showDocumentInfo,
}) {
  const createDraft = useStore(store => store.createDraft);

  // An annotation will have a draft if it is being edited
  const draft = useStore(store => store.getDraft(annotation));
  const group = useStore(store => store.getGroup(annotation.group));

  const isPrivate = draft ? draft.isPrivate : !isShared(annotation.permissions);
  const tags = draft ? draft.tags : annotation.tags;
  const text = draft ? draft.text : annotation.text;

  const hasQuote = !!quote(annotation);
  const isEmpty = !text && !tags.length;

  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!draft && !isSaving;

  useEffect(() => {
    // TEMPORARY. Create a new draft for new (non-highlight) annotations
    // to put the component in "edit mode."
    if (!isSaving && !draft && isNew(annotation) && !isHighlight(annotation)) {
      createDraft(annotation, {
        tags: annotation.tags,
        text: annotation.text,
        isPrivate: !isShared(annotation.permissions),
      });
    }
  }, [annotation, draft, createDraft, isSaving]);

  const shouldShowActions = !isEditing && !isNew(annotation);
  const shouldShowLicense = isEditing && !isPrivate && group.type !== 'private';

  const onEditTags = ({ tags }) => {
    createDraft(annotation, { ...draft, tags });
  };

  const onEditText = ({ text }) => {
    createDraft(annotation, { ...draft, text });
  };

  const onSave = async () => {
    setIsSaving(true);
    try {
      await annotationsService.save(annotation);
    } catch (err) {
      flash.error(err.message, 'Saving annotation failed');
    } finally {
      setIsSaving(false);
    }
  };

  // TODO
  const fakeOnReply = () => alert('Reply: TBD');

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
              onSave={onSave}
            />
          )}
        </div>
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

  /* Injected services */
  annotationsService: propTypes.object.isRequired,
  flash: propTypes.object.isRequired,
};

AnnotationOmega.injectedProps = ['annotationsService', 'flash'];

export default withServices(AnnotationOmega);
