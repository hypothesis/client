import defaultKeys from '../util/default-keys';

/**
 * A service for persisting convenient client-side defaults for the (browser)
 * user.
 */
// @ngInject
export default function persistedDefaults(localStorage, store) {
  return {
    /**
     * `subscribe` to the store to watch for any changes to defaults;
     * persist any recognized changes to `localStorage`
     */
    persistDefaults() {
      let lastDefaults = store.getDefaults();
      store.subscribe(() => {
        const latestDefaults = store.getDefaults();
        for (let defaultKey in latestDefaults) {
          if (lastDefaults[defaultKey] !== latestDefaults[defaultKey]) {
            if (defaultKey in defaultKeys) {
              // A default has changed (or been added), and it is recognized
              // as a persist-able default: update it
              localStorage.setItem(defaultKeys[defaultKey]);
            }
          }
        }
        lastDefaults = latestDefaults;
      });
    },
  };
}
