import { Input } from '@hypothesis/frontend-shared';
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

import { useAnnotationContext } from '../helpers/AnnotationContext';
import { parseAccountID } from '../helpers/account-id';
import { isReply, shape } from '../helpers/annotation-metadata';
import type { UserItem } from '../helpers/mention-suggestions';
import { wrapDisplayNameMentions, wrapMentions } from '../helpers/mentions';
import { privatePermissions, sharedPermissions } from '../helpers/permissions';
import type { Annotation, Draft } from '../helpers/types';
import AnnotationLicense from './AnnotationLicense';
import AnnotationPublishControl from './AnnotationPublishControl';
import MarkdownEditor from './MarkdownEditor';
import { TagEditor } from './TagEditor';
import { useUnsavedChanges } from './hooks/unsaved-changes';

export type AnnotationEditorProps = {
  /** The annotation under edit */
  annotation: Annotation;
  /** The annotation's draft */
  draft: Draft;
  onChangeDraft: (draft: Draft) => void;
};

export default function AnnotationEditor({
  annotation,
  draft,
  onChangeDraft,
}: AnnotationEditorProps) {
  // Track the currently-entered text in the tag editor's input
  const [pendingTag, setPendingTag] = useState<string | null>(null);

  const { group, features, events, mentionMode, usersForMentions } =
    useAnnotationContext();
  const isReplyAnno = useMemo(() => isReply(annotation), [annotation]);

  const showDescription = useMemo(
    () => features.imageDescriptions && shape(annotation),
    [annotation, features.imageDescriptions],
  );

  const shouldShowLicense =
    !draft.isPrivate && group && group.type !== 'private';

  // When the Help panel is disabled, also hide other help links in the app
  // which link to external websites.
  const showHelpLink = false; // TODO

  const tags = draft.tags;
  const text = draft.text;
  const description = draft.description;
  const isEmpty = !text && !tags.length && !description;

  // Warn user if they try to close the tab while there is an open, non-empty
  // draft.
  //
  // WARNING: This does not work in all browsers. See hook docs for details.
  useUnsavedChanges(!isEmpty);

  const onEditDescription = useCallback(
    (description: string) => onChangeDraft({ ...draft, description }),
    [draft, onChangeDraft],
  );

  const onEditTags = useCallback(
    (tags: string[]) => onChangeDraft({ ...draft, tags }),
    [draft, onChangeDraft],
  );

  const onAddTag = useCallback(
    /**
     * Verify `newTag` has content and is not a duplicate; add the tag
     *
     * @return `true` if tag was added to the draft; `false` if duplicate or
     *         empty
     */
    (newTag: string) => {
      if (!newTag || tags.indexOf(newTag) >= 0) {
        // don't add empty or duplicate tags
        return false;
      }
      const tagList = [...tags, newTag];
      // Notify consumers about the new tag
      events?.onAddTag?.(newTag);
      onEditTags(tagList);
      return true;
    },
    [tags, events, onEditTags],
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
    [onEditTags, tags],
  );

  const onEditText = useCallback(
    (text: string) => onChangeDraft({ ...draft, text }),
    [draft, onChangeDraft],
  );

  const onSetPrivate = useCallback(
    (isPrivate: boolean) => {
      onChangeDraft({ ...draft, isPrivate });
      events?.onSetPrivate?.(isPrivate);
    },
    [onChangeDraft, draft, events],
  );

  // Map to track users that have been mentioned, based on their display name,
  // so that we can wrap user-name mentions in mention tags when the annotation
  // is eventually saved.
  const displayNameToUserMap = useRef<Map<string, UserItem>>(
    new Map(
      mentionMode === 'username'
        ? []
        : // If the annotation is being edited, it may have mentions. Use them to
          // initialize the display names map
          annotation.mentions
            ?.filter(mention => !!mention.display_name)
            .map(({ userid, username, display_name: displayName }) => [
              displayName!,
              { userid, username, displayName },
            ]),
    ),
  );
  const onInsertMentionSuggestion = useCallback(
    (user: UserItem) => {
      const { displayName } = user;
      // We need to track the user info for every mention in display-name
      // mode, so that it is possible to wrap those mentions in tags
      // afterward.
      if (displayName && mentionMode === 'display-name') {
        displayNameToUserMap.current.set(displayName, user);
      }
    },
    [mentionMode],
  );

  const onSave = useCallback(async () => {
    // If there is any content in the tag editor input field that has
    // not been committed as a tag, go ahead and add it as a tag
    // See https://github.com/hypothesis/product-backlog/issues/1122
    if (pendingTag) {
      onAddTag(pendingTag);
    }

    const userid = annotation.user;
    const changes: Partial<Annotation> = {
      tags: draft.tags,
      permissions: draft.isPrivate
        ? privatePermissions(userid)
        : sharedPermissions(userid, annotation.group),
    };

    if (!features.atMentions) {
      changes.text = draft.text;
    } else if (mentionMode === 'username') {
      const authority = parseAccountID(userid)?.provider ?? ''; // TODO Default authority?
      changes.text = wrapMentions(draft.text, authority);
    } else {
      changes.text = wrapDisplayNameMentions(
        draft.text,
        displayNameToUserMap.current,
      );
    }

    const target = annotation.target;
    if (target[0] && target[0].description !== draft.description) {
      const newTarget = structuredClone(target);
      newTarget[0].description = draft.description;
      changes.target = newTarget;
    }

    // TODO The client passes the annotation as it was originally to the
    //      service, then the services checks if a draft for that annotation
    //      exists and updates the annotation there.
    //      Here we do the merging with the draft before calling `onSave`.
    //      The only exception are mentions
    events?.onSave?.({ ...annotation, ...changes });
  }, [
    pendingTag,
    annotation,
    draft.tags,
    draft.isPrivate,
    draft.description,
    draft.text,
    features.atMentions,
    mentionMode,
    events,
    onAddTag,
  ]);

  const onCancel = useCallback(() => {
    displayNameToUserMap.current = new Map();
    events?.onCancel?.();
  }, [events]);

  // Allow saving of annotation by pressing CMD/CTRL-Enter
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key;
      if (isEmpty) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === 'Enter') {
        event.stopPropagation();
        event.preventDefault();
        onSave();
      }
    },
    [isEmpty, onSave],
  );

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      data-testid="annotation-editor"
      className="space-y-4"
      onKeyDown={onKeyDown}
    >
      {showDescription && (
        <Input
          data-testid="description"
          placeholder="Describe selected area..."
          aria-label="Describe selected area"
          value={description}
          onInput={e => onEditDescription((e.target as HTMLInputElement).value)}
          // Maximum length for `target.description` field supported by the API.
          maxlength={250}
        />
      )}
      <MarkdownEditor
        // textStyle={textStyle} // TODO
        label={isReplyAnno ? 'Enter reply' : 'Enter comment'}
        text={text}
        onEditText={onEditText}
        mentionsEnabled={features.atMentions}
        usersForMentions={usersForMentions}
        showHelpLink={showHelpLink}
        mentions={annotation.mentions}
        mentionMode={mentionMode}
        onInsertMentionSuggestion={onInsertMentionSuggestion}
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
