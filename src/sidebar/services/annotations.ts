import { generateHexString } from '../../shared/random';
import type { AnnotationData } from '../../types/annotator';
import type {
  APIAnnotationData,
  Annotation,
  SavedAnnotation,
} from '../../types/api';
import type { AnnotationEventType, SidebarSettings } from '../../types/config';
import { parseAccountID } from '../helpers/account-id';
import * as metadata from '../helpers/annotation-metadata';
import type { UserItem } from '../helpers/mention-suggestions';
import { wrapDisplayNameMentions, wrapMentions } from '../helpers/mentions';
import {
  defaultPermissions,
  privatePermissions,
  sharedPermissions,
} from '../helpers/permissions';
import type { SidebarStore } from '../store';
import type { AnnotationActivityService } from './annotation-activity';
import type { APIService } from './api';
import type { LocalStorageService } from './local-storage';

export type MentionsOptions =
  | {
      mentionMode: 'username';
    }
  | {
      mentionMode: 'display-name';
      /**
       * A display-name/user-info map so that mention tags can be generated from
       * display-name mentions
       */
      usersMap: Map<string, UserItem>;
    };

/**
 * A service for creating, updating and persisting annotations both in the
 * local store and on the backend via the API.
 */
// @inject
export class AnnotationsService {
  private _activity: AnnotationActivityService;
  private _api: APIService;
  private _settings: SidebarSettings;
  private _store: SidebarStore;
  private _localStorage: LocalStorageService;

  constructor(
    annotationActivity: AnnotationActivityService,
    api: APIService,
    settings: SidebarSettings,
    store: SidebarStore,
    localStorage: LocalStorageService,
  ) {
    this._activity = annotationActivity;
    this._api = api;
    this._settings = settings;
    this._store = store;
    this._localStorage = localStorage;
  }

  /**
   * Apply changes for the given `annotation` from its draft in the store (if
   * any) and return a new object with those changes integrated.
   */
  private _applyDraftChanges(
    annotation: Annotation,
    mentionsOptions: MentionsOptions,
  ): Annotation {
    const changes: Partial<Annotation> = {};
    const draft = this._store.getDraft(annotation);
    const authority =
      parseAccountID(this._store.profile().userid)?.provider ??
      this._store.defaultAuthority();
    const mentionsEnabled = this._store.isFeatureEnabled('at_mentions');

    if (!draft) {
      return { ...annotation };
    }

    if (!mentionsEnabled) {
      changes.text = draft.text;
    } else if (mentionsOptions.mentionMode === 'username') {
      changes.text = wrapMentions(draft.text, authority);
    } else {
      changes.text = wrapDisplayNameMentions(
        draft.text,
        mentionsOptions.usersMap,
      );
    }

    changes.tags = draft.tags;
    changes.permissions = draft.isPrivate
      ? privatePermissions(annotation.user)
      : sharedPermissions(annotation.user, annotation.group);

    const target = annotation.target;
    if (target[0] && target[0].description !== draft.description) {
      const newTarget = structuredClone(target);
      newTarget[0].description = draft.description;
      changes.target = newTarget;
    }

    // Integrate changes from draft into object to be persisted
    return { ...annotation, ...changes };
  }

  /**
   * Create a new {@link Annotation} object from a set of field values.
   *
   * All fields not set in `annotationData` will be populated with default
   * values.
   */
  annotationFromData(
    annotationData: Partial<APIAnnotationData> &
      Pick<AnnotationData, 'uri' | 'target'>,
    /* istanbul ignore next */
    now: Date = new Date(),
  ): Annotation {
    const defaultPrivacy = this._store.getDefault('annotationPrivacy');
    const groupid = this._store.focusedGroupId();
    const profile = this._store.profile();

    if (!groupid) {
      throw new Error('Cannot create annotation without a group');
    }

    const userid = profile.userid;
    if (!userid) {
      throw new Error('Cannot create annotation when logged out');
    }

    const userInfo = profile.user_info;

    // We need a unique local/app identifier for this new annotation such
    // that we might look it up later in the store. It won't have an ID yet,
    // as it has not been persisted to the service.
    const $tag = `s:${generateHexString(8)}`;
    const annotation: Annotation = Object.assign(
      {
        created: now.toISOString(),
        group: groupid,
        permissions: defaultPermissions(userid, groupid, defaultPrivacy),
        tags: [],
        text: '',
        updated: now.toISOString(),
        user: userid,
        user_info: userInfo,
        $tag,
        hidden: false,
        links: {},
        document: { title: '' },
      },
      annotationData,
    );

    // Highlights are peculiar in that they always have private permissions
    if (metadata.isHighlight(annotation)) {
      annotation.permissions = privatePermissions(userid);
    }

    // Attach information about the current context (eg. LMS assignment).
    if (this._settings.annotationMetadata) {
      annotation.metadata = { ...this._settings.annotationMetadata };
    }

    return annotation;
  }

  /**
   * Populate a new annotation object from `annotation` and add it to the store.
   * Create a draft for it unless it's a highlight and clear other empty
   * drafts out of the way.
   */
  create(annotationData: Omit<AnnotationData, '$tag'>, now = new Date()) {
    const annotation = this.annotationFromData(annotationData, now);

    this._store.addAnnotations([annotation]);

    // Remove other drafts that are in the way, and their annotations (if new)
    this._store.deleteNewAndEmptyDrafts();

    // Create a draft unless it's a highlight
    if (!metadata.isHighlight(annotation)) {
      this._store.createDraft(annotation, {
        tags: annotation.tags,
        text: annotation.text,
        isPrivate: !metadata.isPublic(annotation),
        description: annotation.target[0]?.description,
      });
    }

    // NB: It may make sense to move the following code at some point to
    // the UI layer
    // Select the correct tab
    // If the annotation is of type note or annotation, make sure
    // the appropriate tab is selected. If it is of type reply, user
    // stays in the selected tab.
    if (metadata.isPageNote(annotation)) {
      this._store.selectTab('note');
    } else if (metadata.isAnnotation(annotation)) {
      this._store.selectTab('annotation');
    }

    (annotation.references || []).forEach(parent => {
      // Expand any parents of this annotation.
      this._store.setExpanded(parent, true);
    });
  }

  /**
   * Create a new empty "page note" annotation and add it to the store. If the
   * user is not logged in, open the `loginPrompt` panel instead.
   */
  createPageNote() {
    const topLevelFrame = this._store.mainFrame();
    if (!this._store.isLoggedIn()) {
      this._store.openSidebarPanel('loginPrompt');
      return;
    }
    if (!topLevelFrame) {
      return;
    }
    const pageNoteAnnotation = {
      target: [
        {
          source: topLevelFrame.uri,
        },
      ],
      uri: topLevelFrame.uri,
    };
    this.create(pageNoteAnnotation);
  }

  /**
   * Delete an annotation from local storage and update the store.
   */
  async delete(annotation: SavedAnnotation) {
    // Key for storing annotations in local storage
    const ANNOTATIONS_STORAGE_KEY = 'hypothesis.annotations';

    const allAnnotations: Annotation[] =
      this._localStorage.getObject(ANNOTATIONS_STORAGE_KEY) || [];

    if (allAnnotations.length === 0) {
      console.warn(
        `Attempted to delete annotation ID: ${annotation.id}, but no annotations found in local storage.`,
      );
      // Still proceed to remove from store and report activity as it might be in memory
    }

    // Filter out the annotation to be deleted.
    // Primarily use `id`. If `id` is not present on `ann` (which shouldn't happen for SavedAnnotation from local storage),
    // or if `id` on `annotation` is somehow null/undefined, this will skip.
    // Given that `save` generates a local `id`, this should be reliable.
    const updatedAnnotations = allAnnotations.filter(ann => {
      if (annotation.id) {
        return ann.id !== annotation.id;
      }
      // Fallback or safety net, though `id` should be the primary mechanism
      // For a SavedAnnotation, `id` should always be present.
      // If we were dealing with non-saved annotations, $tag might be more relevant.
      return ann.$tag !== annotation.$tag;
    });

    if (updatedAnnotations.length < allAnnotations.length) {
      this._localStorage.setObject(ANNOTATIONS_STORAGE_KEY, updatedAnnotations);
    } else {
      console.warn(
        `Annotation ID: ${annotation.id} (or $tag: ${annotation.$tag}) not found in local storage for deletion.`,
      );
    }

    this._activity.reportActivity('delete', annotation);
    this._store.removeAnnotations([annotation]);
  }

  /**
   * Flag an annotation for review by a moderator.
   */
  async flag(annotation: SavedAnnotation) {
    await this._api.annotation.flag({ id: annotation.id });
    this._activity.reportActivity('flag', annotation);
    this._store.updateFlagStatus(annotation.id, true);
  }

  /**
   * Create a reply to `annotation` by the user `userid` and add to the store.
   */
  reply(annotation: SavedAnnotation, userid: string) {
    const replyAnnotation = {
      group: annotation.group,
      permissions: metadata.isPublic(annotation)
        ? sharedPermissions(userid, annotation.group)
        : privatePermissions(userid),
      references: (annotation.references || []).concat(annotation.id),
      target: [{ source: annotation.target[0].source }],
      uri: annotation.uri,
    };
    this.create(replyAnnotation);
  }

  /**
   * Save new (or update existing) annotation. On success,
   * the annotation's `Draft` will be removed and the annotation added
   * to the store.
   */
  async save(
    annotation: Annotation,
    mentionsOptions: MentionsOptions = { mentionMode: 'username' },
  ) {
    let eventType: AnnotationEventType;

    const annotationWithChanges = this._applyDraftChanges(
      annotation,
      mentionsOptions,
    );

    // Key for storing annotations in local storage
    const ANNOTATIONS_STORAGE_KEY = 'hypothesis.annotations';

    this._store.annotationSaveStarted(annotation);

    let savedAnnotation = annotationWithChanges;

    try {
      const allAnnotations: Annotation[] =
        this._localStorage.getObject(ANNOTATIONS_STORAGE_KEY) || [];

      if (!metadata.isSaved(annotation)) {
        // New annotation. Add to the list.
        // Ensure it has a unique $tag if not already present (annotationFromData should handle this).
        // For local storage, we might not have a server 'id' yet.
        // We'll use $tag for identification within local storage if 'id' is missing.
        savedAnnotation.id = generateHexString(10); // Generate a local ID
        allAnnotations.push(savedAnnotation);
        eventType = 'create';
      } else {
        // Existing annotation. Find and update.
        // Prioritize 'id' for matching if available (though for purely local, $tag might be more consistent)
        const existingIndex = allAnnotations.findIndex(
          ann =>
            (ann.id && ann.id === annotation.id) || ann.$tag === annotation.$tag,
        );
        if (existingIndex !== -1) {
          allAnnotations[existingIndex] = savedAnnotation;
        } else {
          // If not found by id or $tag (e.g. if it was saved with an ID but now only $tag matches),
          // or simply not found, add it as a new one.
          // This case might need refinement based on how IDs are handled locally vs. server.
          allAnnotations.push(savedAnnotation);
        }
        eventType = 'update';
      }

      this._localStorage.setObject(ANNOTATIONS_STORAGE_KEY, allAnnotations);
      this._activity.reportActivity(eventType, savedAnnotation);
    } finally {
      this._store.annotationSaveFinished(annotation);
    }

    // Copy local/internal fields from the original annotation to the saved
    // version. This is important for fields like $tag.
    for (const [key, value] of Object.entries(annotation)) {
      if (key.startsWith('$')) {
        (savedAnnotation as Record<string, any>)[key] = value;
      }
    }
    // Ensure the savedAnnotation that goes to the store also has these fields if they were added/modified
    // in annotationWithChanges but not in the original `annotation`'s $ fields.
    for (const [key, value] of Object.entries(annotationWithChanges)) {
      if (key.startsWith('$')) {
        (savedAnnotation as Record<string, any>)[key] = value;
      }
    }

    // Clear out any pending changes (draft)
    this._store.removeDraft(annotation);

    // Add (or, in effect, update) the annotation to the store's collection
    this._store.addAnnotations([savedAnnotation]);
    return savedAnnotation;
  }
}
