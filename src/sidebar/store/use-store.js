/* global process */

import { useEffect, useRef, useReducer } from 'preact/hooks';
import shallowEqual from 'shallowequal';

import warnOnce from '../../shared/warn-once';
import { useService } from '../util/service-context';

/** @typedef {import("redux").Store} Store */
/** @typedef {import("./create-store").SidebarStore} SidebarStore */

/**
 * @template T
 * @callback StoreCallback
 * @param {SidebarStore} store
 * @return {T}
 */

/**
 * Hook for accessing state or actions from the store inside a component.
 *
 * This hook fetches the store using `useService` and returns the result of
 * passing it to the provided callback. The callback will be re-run whenever
 * the store updates and the component will be re-rendered if the result of
 * `callback(store)` changed.
 *
 * This ensures that the component updates when relevant store state changes.
 *
 * @example
 *   function MyWidget({ widgetId }) {
 *     const widget = useStore(store => store.getWidget(widgetId));
 *     const hideWidget = useStore(store => store.hideWidget);
 *
 *     return (
 *       <div>
 *         {widget.name}
 *         <button onClick={() => hideWidget(widgetId)}>Hide</button>
 *       </div>
 *     )
 *   }
 *
 * @template T
 * @param {StoreCallback<T>} callback -
 *   Callback that receives the store as an argument and returns some state
 *   and/or actions extracted from the store.
 * @return {T} - The result of `callback(store)`
 */
export default function useStore(callback) {
  const store = useService('store');

  // Store the last-used callback in a ref so we can access it in the effect
  // below without having to re-subscribe to the store when it changes.
  const lastCallback = useRef(/** @type {StoreCallback<T>|null} */ (null));
  lastCallback.current = callback;

  const lastResult = useRef(/** @type {T|undefined} */ (undefined));
  lastResult.current = callback(store);

  // Check for a performance issue caused by `callback` returning a different
  // result on every call, even if the store has not changed.
  if (process.env.NODE_ENV !== 'production') {
    if (!shallowEqual(lastResult.current, callback(store))) {
      warnOnce(
        'The output of a callback passed to `useStore` changes every time. ' +
          'This will lead to a component updating more often than necessary.'
      );
    }
  }

  // Abuse `useReducer` to force updates when the store state changes.

  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Connect to the store, call `callback(store)` whenever the store changes
  // and re-render the component if the result changed.
  useEffect(() => {
    function checkForUpdate() {
      const result = lastCallback.current(store);
      if (shallowEqual(result, lastResult.current)) {
        return;
      }
      lastResult.current = result;
      // Force this function to ignore parameters and just force a store update.
      /** @type {()=>any} */ (forceUpdate)();
    }

    // Check for any changes since the component was rendered.
    checkForUpdate();

    // Check for updates when the store changes in future.
    const unsubscribe = store.subscribe(checkForUpdate);

    // Remove the subscription when the component is unmounted.
    return unsubscribe;
  }, [forceUpdate, store]);

  return lastResult.current;
}
