import SearchClient from '../search-client';
import { isNew, isPublic } from '../util/annotation-metadata';
import { privatePermissions, sharedPermissions } from '../util/permissions';

// @ngInject
export default function annotationsService(
  annotationMapper,
  api,
  store,
  streamer,
  streamFilter
) {
  let searchClient = null;

  /**
   * Load annotations for all URIs and groupId.
   *
   * @param {string[]} uris
   * @param {string} groupId
   */
  function load(uris, groupId) {
    annotationMapper.unloadAnnotations(store.savedAnnotations());

    // Cancel previously running search client.
    if (searchClient) {
      searchClient.cancel();
    }

    if (uris.length > 0) {
      searchAndLoad(uris, groupId);

      streamFilter.resetFilter().addClause('/uri', 'one_of', uris);
      streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    }
  }

  function searchAndLoad(uris, groupId) {
    searchClient = new SearchClient(api.search, {
      incremental: true,
    });
    searchClient.on('results', results => {
      if (results.length) {
        annotationMapper.loadAnnotations(results);
      }
    });
    searchClient.on('error', error => {
      console.error(error);
    });
    searchClient.on('end', () => {
      // Remove client as it's no longer active.
      searchClient = null;

      store.frames().forEach(function(frame) {
        if (0 <= uris.indexOf(frame.uri)) {
          store.updateFrameAnnotationFetchStatus(frame.uri, true);
        }
      });
      store.annotationFetchFinished();
    });
    store.annotationFetchStarted();
    searchClient.get({ uri: uris, group: groupId });
  }

  /**
   * Apply changes for the given `annotation` from its draft in the store (if
   * any) and return a new object with those changes integrated.
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
   * Create a reply to `annotation` by the user `userid` and add to the store.
   *
   * @param {Object} annotation
   * @param {string} userid
   */
  function reply(annotation, userid) {
    const replyAnnotation = {
      group: annotation.group,
      permissions: isPublic(annotation)
        ? sharedPermissions(userid, annotation.group)
        : privatePermissions(userid),
      references: (annotation.references || []).concat(annotation.id),
      target: [{ source: annotation.target[0].source }],
      uri: annotation.uri,
    };
    store.createAnnotation(replyAnnotation);
  }

  /**
   * Save new (or update existing) annotation. On success,
   * the annotation's `Draft` will be removed and the annotation added
   * to the store.
   */
  async function save(annotation) {
    let saved;

    const annotationWithChanges = applyDraftChanges(annotation);

    if (isNew(annotation)) {
      saved = api.annotation.create({}, annotationWithChanges);
    } else {
      saved = api.annotation.update(
        { id: annotation.id },
        annotationWithChanges
      );
    }

    const savedAnnotation = await saved;

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
    load,
    reply,
    save,
  };
}
