import { watch } from '../util/watch';

/**
 * A service for reading and persisting convenient client-side defaults for
 * the (browser) user.
 */

const DEFAULT_KEYS = {
  annotationPrivacy: 'hypothesis.privacy',
  focusedGroup: 'hypothesis.groups.focus',
};

// @inject
export default function persistedDefaults(localStorage, store) {
  /**
   * Store subscribe callback for persisting changes to defaults. It will only
   * persist defaults that it "knows about" via `DEFAULT_KEYS`.
   */
  function persistChangedDefaults(defaults, prevDefaults) {
    for (let defaultKey in defaults) {
      if (
        prevDefaults[defaultKey] !== defaults[defaultKey] &&
        defaultKey in DEFAULT_KEYS
      ) {
        localStorage.setItem(DEFAULT_KEYS[defaultKey], defaults[defaultKey]);
      }
    }
  }

  return {
    /**
     * Initially populate the store with any available persisted defaults,
     * then subscribe to the store in order to persist any changes to
     * those defaults.
     */
    init() {
      // Read persisted defaults into the store
      Object.keys(DEFAULT_KEYS).forEach(defaultKey => {
        // `localStorage.getItem` will return `null` for a non-existent key
        const defaultValue = localStorage.getItem(DEFAULT_KEYS[defaultKey]);
        store.setDefault(defaultKey, defaultValue);
      });

      // Listen for changes to those defaults from the store and persist them
      watch(store.subscribe, () => store.getDefaults(), persistChangedDefaults);
    },
  };
}
