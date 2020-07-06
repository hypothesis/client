/** @typedef {import('../../types/api').Annotation} Annotation */
/** @typedef {import('../../types/annotator').AnnotationData} AnnotationData */

/**
 * A service for creating, manipulating and persisting annotations and their
 * application-store representations. Interacts with API services as needed.
 */

import * as metadata from '../util/annotation-metadata';
import {
  defaultPermissions,
  privatePermissions,
  sharedPermissions,
} from '../util/permissions';
import { generateHexString } from '../util/random';
import uiConstants from '../ui-constants';

// @ngInject
export default function annotationsService(api, store) {
  /**
   * Apply changes for the given `annotation` from its draft in the store (if
   * any) and return a new object with those changes integrated.
   *
   * @param {Annotation} annotation
   */
  function applyDraftChanges(annotation) {
    const changes = {};
    const draft = store.getDraft(annotation);

    if (draft) {
      changes.tags = draft.tags;
      changes.text = draft.text;
      changes.permissions = draft.isPrivate
        ? privatePermissions(annotation.user)
        : sharedPermissions(annotation.user, annotation.group);
    }

    // Integrate changes from draft into object to be persisted
    return { ...annotation, ...changes };
  }

  /**
   * Extend new annotation objects with defaults and permissions.
   *
   * @param {AnnotationData} annotationData
   * @param {Date} now
   * @return {Annotation}
   */
  function initialize(annotationData, now = new Date()) {
    const defaultPrivacy = store.getDefault('annotationPrivacy');
    const groupid = store.focusedGroupId();
    const profile = store.profile();

    const userid = profile.userid;
    const userInfo = profile.user_info;

    // We need a unique local/app identifier for this new annotation such
    // that we might look it up later in the store. It won't have an ID yet,
    // as it has not been persisted to the service.
    const $tag = generateHexString(8);

    /** @type {Annotation} */
    const annotation = Object.assign(
      {
        created: now.toISOString(),
        group: groupid,
        permissions: defaultPermissions(userid, groupid, defaultPrivacy),
        tags: [],
        text: '',
        updated: now.toISOString(),
        user: userid,
        user_info: userInfo,
        $tag: $tag,
        hidden: false,
        links: {},
      },
      annotationData
    );

    // Highlights are peculiar in that they always have private permissions
    if (metadata.isHighlight(annotation)) {
      annotation.permissions = privatePermissions(userid);
    }
    return annotation;
  }

  /**
   * Populate a new annotation object from `annotation` and add it to the store.
   * Create a draft for it unless it's a highlight and clear other empty
   * drafts out of the way.
   *
   * @param {Object} annotationData
   * @param {Date} now
   */
  function create(annotationData, now = new Date()) {
    const annotation = initialize(annotationData, now);

    store.addAnnotations([annotation]);

    // Remove other drafts that are in the way, and their annotations (if new)
    store.deleteNewAndEmptyDrafts();

    // Create a draft unless it's a highlight
    if (!metadata.isHighlight(annotation)) {
      store.createDraft(annotation, {
        tags: annotation.tags,
        text: annotation.text,
        isPrivate: !metadata.isPublic(annotation),
      });
    }

    // NB: It may make sense to move the following code at some point to
    // the UI layer
    // Select the correct tab
    // If the annotation is of type note or annotation, make sure
    // the appropriate tab is selected. If it is of type reply, user
    // stays in the selected tab.
    if (metadata.isPageNote(annotation)) {
      store.selectTab(uiConstants.TAB_NOTES);
    } else if (metadata.isAnnotation(annotation)) {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
    }

    (annotation.references || []).forEach(parent => {
      // Expand any parents of this annotation.
      store.setCollapsed(parent, false);
    });
  }

  /**
   * Delete an annotation via the API and update the store.
   */
  async function delete_(annotation) {
    await api.annotation.delete({ id: annotation.id });
    store.removeAnnotations([annotation]);
  }

  /**
   * Flag an annotation for review by a moderator.
   */
  async function flag(annotation) {
    await api.annotation.flag({ id: annotation.id });
    store.updateFlagStatus(annotation.id, true);
  }

  /**
   * Create a reply to `annotation` by the user `userid` and add to the store.
   *
   * @param {Object} annotation
   * @param {string} userid
   */
  function reply(annotation, userid) {
    const replyAnnotation = {
      group: annotation.group,
      permissions: metadata.isPublic(annotation)
        ? sharedPermissions(userid, annotation.group)
        : privatePermissions(userid),
      references: (annotation.references || []).concat(annotation.id),
      target: [{ source: annotation.target[0].source }],
      uri: annotation.uri,
    };
    create(replyAnnotation);
  }

  /**
   * Save new (or update existing) annotation. On success,
   * the annotation's `Draft` will be removed and the annotation added
   * to the store.
   */
  async function save(annotation) {
    let saved;

    const annotationWithChanges = applyDraftChanges(annotation);

    if (metadata.isNew(annotation)) {
      saved = api.annotation.create({}, annotationWithChanges);
    } else {
      saved = api.annotation.update(
        { id: annotation.id },
        annotationWithChanges
      );
    }

    let savedAnnotation;
    store.annotationSaveStarted(annotation);
    try {
      savedAnnotation = await saved;
    } finally {
      store.annotationSaveFinished(annotation);
    }

    Object.keys(annotation).forEach(key => {
      if (key[0] === '$') {
        savedAnnotation[key] = annotation[key];
      }
    });

    // Clear out any pending changes (draft)
    store.removeDraft(annotation);

    // Add (or, in effect, update) the annotation to the store's collection
    store.addAnnotations([savedAnnotation]);
    return savedAnnotation;
  }

  return {
    create,
    delete: delete_,
    flag,
    reply,
    save,
  };
}
