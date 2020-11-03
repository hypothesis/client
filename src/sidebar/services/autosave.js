/**
 * A service for automatically saving new highlights.
 */
import { retryPromiseOperation } from '../util/retry';

// @inject
export default function autosaveService(annotationsService, store) {
  // A Set of annotation $tags that have save requests in-flight
  const saving = new Set();

  // A Set of annotation $tags that have failed to save after retries
  const failed = new Set();

  /**
   * Determine whether we should try to send a save request for the highlight
   * indicated by `htag`
   *
   * @param {string} htag - The local unique identifier for the unsaved highlight
   * @return {boolean}
   */
  const shouldSaveHighlight = htag => {
    return !saving.has(htag) && !failed.has(htag);
  };

  /**
   * Store-subscribed call back. Automatically save new highlights.
   */
  const autosaveNewHighlights = () => {
    const newHighlights = store.newHighlights();

    newHighlights.forEach(highlight => {
      // Because this is a new annotation object, it does not yet have an `id`
      // property. Use the local `$tag` for uniqueness instead.
      const htag = highlight.$tag;

      if (!shouldSaveHighlight(htag)) {
        return;
      }

      saving.add(htag);

      retryPromiseOperation(() => annotationsService.save(highlight))
        .catch(() => {
          // save failed after retries
          failed.add(htag);
        })
        .finally(() => {
          // Request is complete, no longer attempting to save
          saving.delete(htag);
        });
    });
  };

  return {
    init() {
      store.subscribe(autosaveNewHighlights);
    },
    isSaving() {
      return saving.size > 0;
    },
  };
}
