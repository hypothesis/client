import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import type { Annotation } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import { serviceConfig } from '../../config/service-config';
import { isThirdPartyUser } from '../../helpers/account-id';
import {
  annotationRole,
  isReply,
  isSaved,
} from '../../helpers/annotation-metadata';
import type { UserItem } from '../../helpers/mention-suggestions';
import { combineUsersForMentions } from '../../helpers/mention-suggestions';
import type { MentionMode } from '../../helpers/mentions';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import type { AnnotationsService } from '../../services/annotations';
import type { GroupsService } from '../../services/groups';
import type { TagsService } from '../../services/tags';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import type { Draft } from '../../store/modules/drafts';
import MarkdownEditor from '../MarkdownEditor';
import TagEditor from '../TagEditor';
import { useUnsavedChanges } from '../hooks/unsaved-changes';
import AnnotationLicense from './AnnotationLicense';
import AnnotationPublishControl from './AnnotationPublishControl';

type AnnotationEditorProps = {
  /** The annotation under edit */
  annotation: Annotation;
  /** The annotation's draft */
  draft: Draft;

  // Injected
  annotationsService: AnnotationsService;
  groups: GroupsService;
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
  groups: groupsService,
  settings,
  tags: tagsService,
  toastMessenger,
}: AnnotationEditorProps) {
  // Track the currently-entered text in the tag editor's input
  const [pendingTag, setPendingTag] = useState<string | null>(null);

  const store = useSidebarStore();
  const group = store.getGroup(annotation.group);
  const isReplyAnno = useMemo(() => isReply(annotation), [annotation]);

  const shouldShowLicense =
    !draft.isPrivate && group && group.type !== 'private';

  // When the Help panel is disabled, also hide other help links in the app
  // which link to external websites.
  const showHelpLink = serviceConfig(settings)?.enableHelpPanel ?? true;

  const tags = draft.tags;
  const text = draft.text;
  const isEmpty = !text && !tags.length;

  // Warn user if they try to close the tab while there is an open, non-empty
  // draft.
  //
  // WARNING: This does not work in all browsers. See hook docs for details.
  useUnsavedChanges(!isEmpty);

  const onEditTags = useCallback(
    (tags: string[]) => {
      store.createDraft(draft.annotation, { ...draft, tags });
    },
    [draft, store],
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
    [onEditTags, tags, tagsService],
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
    (text: string) => {
      store.createDraft(draft.annotation, { ...draft, text });
    },
    [draft, store],
  );

  const onSetPrivate = useCallback(
    (isPrivate: boolean) => {
      store.createDraft(annotation, {
        ...draft,
        isPrivate,
      });
      // Persist this as privacy default for future annotations unless this is a reply
      if (!isReplyAnno) {
        store.setDefault('annotationPrivacy', isPrivate ? 'private' : 'shared');
      }
    },
    [annotation, draft, isReplyAnno, store],
  );

  const defaultAuthority = store.defaultAuthority();
  const mentionMode = useMemo(
    (): MentionMode =>
      isThirdPartyUser(annotation.user, defaultAuthority)
        ? 'display-name'
        : 'username',
    [annotation.user, defaultAuthority],
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
      await annotationsService.save(
        annotation,
        mentionMode === 'username'
          ? { mentionMode }
          : { mentionMode, usersMap: displayNameToUserMap.current },
      );
      toastMessenger.success(successMessage, { visuallyHidden: true });
      displayNameToUserMap.current = new Map();
    } catch {
      toastMessenger.error('Saving annotation failed');
    }
  };

  // Revert changes to this annotation
  const onCancel = useCallback(() => {
    store.removeDraft(annotation);
    displayNameToUserMap.current = new Map();
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

  const mentionsEnabled = store.isFeatureEnabled('at_mentions');
  const usersWhoAnnotated = store.usersWhoAnnotated();
  const usersWhoWereMentioned = store.usersWhoWereMentioned();
  const focusedGroupMembers = store.getFocusedGroupMembers();
  const usersForMentions = useMemo(
    () =>
      combineUsersForMentions({
        usersWhoAnnotated,
        usersWhoWereMentioned,
        focusedGroupMembers,
        mentionMode,
      }),
    [
      focusedGroupMembers,
      mentionMode,
      usersWhoAnnotated,
      usersWhoWereMentioned,
    ],
  );

  useEffect(() => {
    // Load members for focused group only if not yet loaded
    if (mentionsEnabled && focusedGroupMembers.status === 'not-loaded') {
      groupsService.loadFocusedGroupMembers();
    }
  }, [focusedGroupMembers, groupsService, mentionsEnabled]);

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      data-testid="annotation-editor"
      className="space-y-4"
      onKeyDown={onKeyDown}
    >
      <MarkdownEditor
        textStyle={textStyle}
        label={isReplyAnno ? 'Enter reply' : 'Enter comment'}
        text={text}
        onEditText={onEditText}
        mentionsEnabled={mentionsEnabled}
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

export default withServices(AnnotationEditor, [
  'annotationsService',
  'groups',
  'settings',
  'tags',
  'toastMessenger',
]);
