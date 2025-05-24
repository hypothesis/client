import type { Draft, State as DraftsState } from '../store/modules/drafts';
import { draftsModule } from '../store/modules/drafts';
import type { SidebarStore } from '../store';
import type { LocalStorageService } from './local-storage';

// Action type to be added to drafts.ts
const LOAD_DRAFTS_FROM_STORAGE = 'LOAD_DRAFTS_FROM_STORAGE';

const DRAFTS_STORAGE_KEY = 'hypothesis.drafts';

/**
 * A service that persists annotation drafts to and from local storage.
 * It listens for changes in the drafts store module and saves them,
 * and loads persisted drafts when the application initializes.
 */
// @inject
export class DraftPersistenceService {
  private _localStorage: LocalStorageService;
  private _store: SidebarStore;
  private _isSubscribed: boolean = false;

  constructor(localStorage: LocalStorageService, store: SidebarStore) {
    this._localStorage = localStorage;
    this._store = store;
  }

  /**
   * Initializes the service:
   * 1. Loads drafts from local storage and dispatches an action to update the store.
   * 2. Subscribes to store changes to persist drafts whenever they are updated.
   */
  init() {
    this._loadPersistedDrafts();
    this._subscribeToDraftChanges();
  }

  /**
   * Loads drafts from local storage. If drafts are found, they are
   * dispatched to the store to rehydrate the state.
   */
  private _loadPersistedDrafts() {
    try {
      const plainDrafts = this._localStorage.getObject<Partial<Draft>[]>(
        DRAFTS_STORAGE_KEY,
      );

      if (plainDrafts && Array.isArray(plainDrafts)) {
        // Dispatch an action to be created in drafts.ts
        // The reducer for this action will handle proper instantiation.
        this._store.dispatch({
          type: draftsModule.actionTypes[LOAD_DRAFTS_FROM_STORAGE] || LOAD_DRAFTS_FROM_STORAGE,
          payload: plainDrafts,
        });
      }
    } catch (e) {
      console.error('Error loading drafts from local storage:', e);
    }
  }

  /**
   * Subscribes to changes in the 'drafts' part of the store's state.
   * When changes are detected, the current drafts are persisted to local storage.
   */
  private _subscribeToDraftChanges() {
    if (this._isSubscribed) {
      return;
    }

    let previousDraftsState: DraftsState | undefined;

    this._store.subscribe(() => {
      const currentDraftsState = this._store.getState().drafts;
      if (currentDraftsState === previousDraftsState) {
        return; // No change in the drafts part of the state
      }

      previousDraftsState = currentDraftsState;
      try {
        // currentDraftsState.drafts are already Draft instances
        this._localStorage.setObject(
          DRAFTS_STORAGE_KEY,
          currentDraftsState.drafts,
        );
      } catch (e) {
        console.error('Error saving drafts to local storage:', e);
      }
    });
    this._isSubscribed = true;
  }
}
