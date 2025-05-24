import type { Annotation } from '../../types/api';
import { isReply } from '../helpers/annotation-metadata';
// import { SearchClient } from '../search-client'; // No longer used
import type { SortBy, SortOrder } from '../search-client'; // Import for sorting
import type { SidebarStore } from '../store';
// import type { APIService } from './api'; // No longer used for loading
// import type { StreamFilter } from './stream-filter'; // No longer used
// import type { StreamerService } from './streamer'; // No longer used
import type { LocalStorageService } from './local-storage';

export type LoadAnnotationOptions = {
  groupId: string;
  uris?: string[];
  /**
   * If number of annotations in search results exceeds this value, do not load
   * annotations (see: `SearchClient`)
   */
  maxResults?: number; // This may become irrelevant with local storage, but kept for signature compatibility

  /**
   * `sortBy` and `sortOrder` control in what order annotations are loaded.
   * This will need to be implemented client-side if still desired.
   */
  sortBy?: SortBy;
  sortOrder?: SortOrder;

  /**
   * Optional error handler. Default error handling logs errors
   * to console.
   */
  onError?: (error: Error) => void; // Kept for compatibility, may be used for local storage errors

  /**
   * Set the websocket stream to filter by either URIs or groupIds.
   */
  streamFilterBy?: 'uri' | 'group';
};

/**
 * A service for fetching annotations via the Hypothesis API and loading them
 * into the store.
 *
 * In addition to fetching annotations it also handles configuring the
 * WebSocket connection so that appropriate real-time updates are received
 * for the set of annotations being displayed.
 *
 * @inject
 */
export class LoadAnnotationsService {
  // private _api: APIService; // API service no longer directly used for loading
  private _store: SidebarStore;
  // private _streamer: StreamerService; // Streamer no longer used here
  // private _streamFilter: StreamFilter; // StreamFilter no longer used here
  // private _searchClient: SearchClient | null; // SearchClient no longer used
  private _localStorage: LocalStorageService;

  constructor(
    // api: APIService, // API service no longer directly used for loading
    store: SidebarStore,
    // streamer: StreamerService, // Streamer no longer used here
    // streamFilter: StreamFilter, // StreamFilter no longer used here
    localStorage: LocalStorageService,
  ) {
    // this._api = api;
    this._store = store;
    // this._streamer = streamer;
    // this._streamFilter = streamFilter;
    this._localStorage = localStorage;
    // this._searchClient = null;
  }

  // Define the key consistently
  private ANNOTATIONS_STORAGE_KEY = 'hypothesis.annotations';

  /**
   * Load annotations from Hypothesis.
   *
   * The existing set of loaded annotations is cleared before the new set
   * is fetched. If an existing annotation fetch is in progress it is canceled.
   */
  load({
    groupId,
    uris,
    onError,
    sortBy = 'updated', // Default sort to 'updated' as per common use-cases
    sortOrder = 'desc', // Default sort order to 'desc'
  }: LoadAnnotationOptions) {
    this._store.removeAnnotations(this._store.savedAnnotations());
    this._store.annotationFetchStarted();

    try {
      let annotationsToLoad: Annotation[] =
        this._localStorage.getObject(this.ANNOTATIONS_STORAGE_KEY) || [];

      // Apply URI filtering
      if (uris && uris.length > 0) {
        annotationsToLoad = annotationsToLoad.filter(
          ann => ann.uri && uris.includes(ann.uri),
        );
      }

      // Apply Group filtering
      if (groupId) {
        annotationsToLoad = annotationsToLoad.filter(
          ann => ann.group === groupId,
        );
      }

      // Apply Sorting
      // Ensure sortBy and sortOrder have valid values, even if not passed in options
      // by relying on defaults.
      annotationsToLoad.sort((a, b) => {
        let valA: number | string;
        let valB: number | string;

        switch (sortBy) {
          case 'created':
            valA = new Date(a.created || 0).getTime();
            valB = new Date(b.created || 0).getTime();
            break;
          case 'updated':
            valA = new Date(a.updated || 0).getTime();
            valB = new Date(b.updated || 0).getTime();
            break;
          // Add other sortBy cases here if needed, e.g., for text or user
          // For now, focusing on date fields as they are most common for sorting.
          default:
            // Default to 'updated' if sortBy is an unexpected value
            valA = new Date(a.updated || 0).getTime();
            valB = new Date(b.updated || 0).getTime();
            break;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          // String comparison
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        } else {
          // Numeric comparison (timestamps)
          return sortOrder === 'asc'
            ? (valA as number) - (valB as number)
            : (valB as number) - (valA as number);
        }
      });

      this._store.addAnnotations(annotationsToLoad);
      this._store.setAnnotationResultCount(annotationsToLoad.length);

      // Update frame annotation fetch status
      const relevantUris = new Set(annotationsToLoad.map(ann => ann.uri));
      if (uris && uris.length > 0) {
        // If specific URIs were requested, only update status for those
        uris.forEach(uri => {
          if (relevantUris.has(uri)) { // Check if any loaded annotations match this URI
            this._store.updateFrameAnnotationFetchStatus(uri, true);
          }
        });
      } else {
        // If no specific URIs were requested (e.g., loading all for a group),
        // update status for all frames that have loaded annotations.
        this._store.frames().forEach(frame => {
          if (relevantUris.has(frame.uri)) {
            this._store.updateFrameAnnotationFetchStatus(frame.uri, true);
          }
        });
      }
    } catch (e) {
      if (onError) {
        onError(e as Error);
      } else {
        console.error('Error loading annotations from local storage:', e);
      }
      // Ensure result count is 0 on error
      this._store.setAnnotationResultCount(0);
    } finally {
      this._store.annotationFetchFinished();
    }
  }

  /**
   * Fetch all annotations in the same thread as `id` and add them to the store.
   *
   * @param id - Annotation ID. This may be an annotation or a reply.
   * @return Top-level annotation in the thread, followed by any replies.
   */
  async loadThread(id: string): Promise<Annotation[]> {
    this._store.clearAnnotations();
    this._store.annotationFetchStarted();

    let threadAnnotations: Annotation[] = [];

    try {
      const allAnnotations: Annotation[] =
        this._localStorage.getObject(this.ANNOTATIONS_STORAGE_KEY) || [];

      if (allAnnotations.length === 0) {
        console.warn(
          `Attempted to load thread for ID: ${id}, but no annotations found in local storage.`,
        );
        return [];
      }

      let targetAnnotation = allAnnotations.find(ann => ann.id === id);

      if (!targetAnnotation) {
        console.warn(
          `Annotation with ID: ${id} not found in local storage for thread loading.`,
        );
        return [];
      }

      let topLevelAnnotation = targetAnnotation;
      if (isReply(targetAnnotation) && targetAnnotation.references?.length) {
        const parentId = targetAnnotation.references[0];
        topLevelAnnotation =
          allAnnotations.find(ann => ann.id === parentId) || targetAnnotation;
      }

      // The thread includes the top-level annotation and all its replies
      threadAnnotations = allAnnotations.filter(
        ann =>
          ann.id === topLevelAnnotation.id ||
          (ann.references && ann.references.includes(topLevelAnnotation.id!)),
      );

      this._store.addAnnotations(threadAnnotations);
    } catch (e) {
      console.error('Error loading thread from local storage:', e);
      // `threadAnnotations` will be empty if an error occurs.
    } finally {
      this._store.annotationFetchFinished();
    }

    // Real-time update logic (streamFilter, streamer) is removed as per requirements.

    return threadAnnotations;
  }
}
