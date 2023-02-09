import { useCallback, useState } from 'preact/hooks';

import type { Annotation } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import {
  annotationRole,
  isReply,
  isSaved,
} from '../../helpers/annotation-metadata';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import type { AnnotationsService } from '../../services/annotations';
import type { TagsService } from '../../services/tags';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import type { Draft } from '../../store/modules/drafts';
import MarkdownEditor from '../MarkdownEditor';
import TagEditor from '../TagEditor';
import AnnotationLicense from './AnnotationLicense';
import AnnotationPublishControl from './AnnotationPublishControl';

type AnnotationEditorProps = {
  /** The annotation under edit */
  annotation: Annotation;
  /** The annotation's draft */
  draft: Draft;

  // Injected
  annotationsService: AnnotationsService;
  settings: SidebarSettings;
  toastMessenger: ToastMessengerService;
  tags: TagsService;
};

/**
 * Display annotation content in an editable format.
 */
function AnnotationEditor({
  annotation,
  draft,
  annotationsService,
  settings,
  tags: tagsService,
  toastMessenger,
}: AnnotationEditorProps) {
  // Track the currently-entered text in the tag editor's input
  const [pendingTag, setPendingTag] = useState<string | null>(null);

  const store = useSidebarStore();
  const group = store.getGroup(annotation.group);

  const shouldShowLicense =
    !draft.isPrivate && group && group.type !== 'private';

  const tags = draft.tags;
  const text = draft.text;
  const isEmpty = !text && !tags.length;

  const onEditTags = useCallback(
    (tags: string[]) => {
      store.createDraft(draft.annotation, { ...draft, tags });
    },
    [draft, store]
  );

  const onAddTag = useCallback(
    /**
     * Verify `newTag` has content and is not a duplicate; add the tag
     *
     * @return `true` if tag was added to the draft; `false` if duplicate or
     * empty
     */
    (newTag: string) => {
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
     * @return `true` if tag removed from draft, `false` if tag not found in
     * draft tags
     */
    (tag: string) => {
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
    (text: string) => {
      store.createDraft(draft.annotation, { ...draft, text });
    },
    [draft, store]
  );

  const onSetPrivate = useCallback(
    (isPrivate: boolean) => {
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
    const successMessage = `${annotationRole(annotation)} ${
      isSaved(annotation) ? 'updated' : 'saved'
    }`;
    try {
      await annotationsService.save(annotation);
      toastMessenger.success(successMessage, { visuallyHidden: true });
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
  const onKeyDown = (event: KeyboardEvent) => {
    const key = event.key;
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
