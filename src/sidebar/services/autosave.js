import { retryPromiseOperation } from '../util/retry';

/**
 * A service for automatically saving new highlights.
 *
 * @inject
 */
export class AutosaveService {
  /**
   * @param {import('./annotations').AnnotationsService} annotationsService
   * @param {import('../store').SidebarStore} store
   */
  constructor(annotationsService, store) {
    this._store = store;

    // A set of annotation $tags that have save requests in-flight
    this._saving = new Set();

    // A set of annotation $tags that have failed to save after retries
    this._failed = new Set();

    /**
     * Determine whether we should try to send a save request for the highlight
     * indicated by `htag`
     *
     * @param {string} htag - The local unique identifier for the unsaved highlight
     * @return {boolean}
     */
    const shouldSaveHighlight = htag => {
      return !this._saving.has(htag) && !this._failed.has(htag);
    };

    /**
     * Store-subscribed call back. Automatically save new highlights.
     */
    this._autosaveNewHighlights = () => {
      const newHighlights = store.newHighlights();

      newHighlights.forEach(highlight => {
        // Because this is a new annotation object, it does not yet have an `id`
        // property. Use the local `$tag` for uniqueness instead.
        const htag = highlight.$tag;

        if (!shouldSaveHighlight(htag)) {
          return;
        }

        this._saving.add(htag);

        retryPromiseOperation(() => annotationsService.save(highlight))
          .catch(() => {
            // save failed after retries
            this._failed.add(htag);
          })
          .finally(() => {
            // Request is complete, no longer attempting to save
            this._saving.delete(htag);
          });
      });
    };
  }

  init() {
    this._store.subscribe(this._autosaveNewHighlights);
  }

  isSaving() {
    return this._saving.size > 0;
  }
}
