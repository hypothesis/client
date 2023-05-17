type BasicStorage = Omit<Storage, 'length' | 'clear' | 'key'>;

/**
 * Fallback in-memory store if `localStorage` is not read/writable.
 */
class InMemoryStorage implements BasicStorage {
  private _store: Map<string, string>;

  constructor() {
    this._store = new Map();
  }

  getItem(key: string): string | null {
    return this._store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this._store.set(key, value);
  }

  removeItem(key: string) {
    this._store.delete(key);
  }
}

/**
 * A wrapper around the `localStorage` API which provides a fallback to
 * in-memory storage in browsers that block access to `window.localStorage`.
 * in third-party iframes.
 *
 * This service also provides convenience methods set and fetch JSON-serializable
 * values.
 */
// @inject
export class LocalStorageService {
  private _storage: BasicStorage;

  constructor($window: Window) {
    const testKey = 'hypothesis.testKey';

    try {
      // Test whether we can read/write localStorage.
      this._storage = $window.localStorage;
      $window.localStorage.setItem(testKey, testKey);
      $window.localStorage.getItem(testKey);
      $window.localStorage.removeItem(testKey);
    } catch (e) {
      this._storage = new InMemoryStorage();
    }
  }

  /**
   * Look up a value in local storage.
   */
  getItem(key: string): string | null {
    return this._storage.getItem(key);
  }

  /**
   * Look up and deserialize a value from storage.
   */
  getObject<T = any>(key: string): T | null {
    const item = this._storage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  }

  /**
   * Set a value in local storage.
   */
  setItem(key: string, value: string) {
    this._storage.setItem(key, value);
  }

  /**
   * Serialize `value` to JSON and persist it.
   */
  setObject(key: string, value: any) {
    const repr = JSON.stringify(value);
    this._storage.setItem(key, repr);
  }

  /**
   * Remove an item from storage.
   */
  removeItem(key: string) {
    this._storage.removeItem(key);
  }
}
