import { normalizeKeyName } from '@hypothesis/frontend-shared';
import { useCallback, useState } from 'preact/hooks';

import { withServices } from '../../service-context';
import { isReply, isSaved } from '../../helpers/annotation-metadata';
import { applyTheme } from '../../helpers/theme';
import { useSidebarStore } from '../../store';

import MarkdownEditor from '../MarkdownEditor';
import TagEditor from '../TagEditor';

import AnnotationLicense from './AnnotationLicense';
import AnnotationPublishControl from './AnnotationPublishControl';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import("../../store/modules/drafts").Draft} Draft
 * @typedef {import("../../../types/config").SidebarSettings} SidebarSettings
 */

/**
 * @typedef AnnotationEditorProps
 * @prop {Annotation} annotation - The annotation under edit
 * @prop {Draft} draft - The annotation's draft
 * @prop {import('../../services/annotations').AnnotationsService} annotationsService
 * @prop {SidebarSettings} settings - Injected service
 * @prop {import('../../services/toast-messenger').ToastMessengerService} toastMessenger
 * @prop {import('../../services/tags').TagsService} tags
 */

/**
 * Display annotation content in an editable format.
 *
 * @param {AnnotationEditorProps} props
 */
function AnnotationEditor({
  annotation,
  draft,
  annotationsService,
  settings,
  tags: tagsService,
  toastMessenger,
}) {
  // Track the currently-entered text in the tag editor's input
  const [pendingTag, setPendingTag] = useState(
    /** @type {string|null} */ (null)
  );

  const store = useSidebarStore();
  const group = store.getGroup(annotation.group);

  const shouldShowLicense =
    !draft.isPrivate && group && group.type !== 'private';

  const tags = draft.tags;
  const text = draft.text;
  const isEmpty = !text && !tags.length;

  const onEditTags = useCallback(
    /** @param {string[]} tags */
    tags => {
      store.createDraft(draft.annotation, { ...draft, tags });
    },
    [draft, store]
  );

  const onAddTag = useCallback(
    /**
     * Verify `newTag` has content and is not a duplicate; add the tag
     *
     * @param {string} newTag
     * @return {boolean} Tag was added to the draft's tags; `false` if duplicate
     *   or empty
     */
    newTag => {
      if (!newTag || tags.indexOf(newTag) >= 0) {
        // don't add empty or duplicate tags
        return false;
      }
      const tagList = [...tags, newTag];
      // Update the tag locally for the suggested-tag list
      tagsService.store(tagList);
      onEditTags(tagList);
      return true;
    },
    [onEditTags, tags, tagsService]
  );

  const onRemoveTag = useCallback(
    /**
     * Remove tag from draft if present.
     *
     * @param {string} tag
     * @return {boolean} Tag removed from draft
     */
    tag => {
      const newTagList = [...tags]; // make a copy
      const index = newTagList.indexOf(tag);
      if (index >= 0) {
        newTagList.splice(index, 1);
        onEditTags(newTagList);
        return true;
      }
      return false;
    },
    [onEditTags, tags]
  );

  const onEditText = useCallback(
    /** @param {string} text */
    text => {
      store.createDraft(draft.annotation, { ...draft, text });
    },
    [draft, store]
  );

  /**
   * @param {boolean} isPrivate
   */
  const onSetPrivate = useCallback(
    /** @param {boolean} isPrivate */
    isPrivate => {
      store.createDraft(annotation, {
        ...draft,
        isPrivate,
      });
      // Persist this as privacy default for future annotations unless this is a reply
      if (!isReply(annotation)) {
        store.setDefault('annotationPrivacy', isPrivate ? 'private' : 'shared');
      }
    },
    [annotation, draft, store]
  );

  const onSave = async () => {
    // If there is any content in the tag editor input field that has
    // not been committed as a tag, go ahead and add it as a tag
    // See https://github.com/hypothesis/product-backlog/issues/1122
    if (pendingTag) {
      onAddTag(pendingTag);
    }
    try {
      await annotationsService.save(annotation);
    } catch (err) {
      toastMessenger.error('Saving annotation failed');
    }
  };

  // Revert changes to this annotation
  const onCancel = useCallback(() => {
    store.removeDraft(annotation);
    if (!isSaved(annotation)) {
      store.removeAnnotations([annotation]);
    }
  }, [annotation, store]);

  // Allow saving of annotation by pressing CMD/CTRL-Enter
  /** @param {KeyboardEvent} event */
  const onKeyDown = event => {
    const key = normalizeKeyName(event.key);
    if (isEmpty) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && key === 'Enter') {
      event.stopPropagation();
      event.preventDefault();
      onSave();
    }
  };

  const textStyle = applyTheme(['annotationFontFamily'], settings);

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      data-testid="annotation-editor"
      className="space-y-4"
      onKeyDown={onKeyDown}
    >
      <MarkdownEditor
        textStyle={textStyle}
        label="Annotation body"
        text={text}
        onEditText={onEditText}
      />
      <TagEditor
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onTagInput={setPendingTag}
        tagList={tags}
      />
      {group && (
        <AnnotationPublishControl
          group={group}
          isDisabled={isEmpty}
          isPrivate={draft.isPrivate}
          onCancel={onCancel}
          onSave={onSave}
          onSetPrivate={onSetPrivate}
        />
      )}
      {shouldShowLicense && <AnnotationLicense />}
    </div>
  );
}

export default withServices(AnnotationEditor, [
  'annotationsService',
  'settings',
  'tags',
  'toastMessenger',
]);
