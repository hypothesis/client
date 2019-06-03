'use strict';

/* global process */

const shallowEqual = require('shallowequal');
const { useEffect, useRef, useReducer } = require('preact/hooks');

const { useService } = require('../util/service-context');
const warnOnce = require('../../shared/warn-once');

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
 * @param {Function} callback -
 *   Callback that receives the store as an argument and returns some state
 *   and/or actions extracted from the store.
 * @return {T} - The result of `callback(store)`
 */
function useStore(callback) {
  const store = useService('store');

  // Store the last-used callback in a ref so we can access it in the effect
  // below without having to re-subscribe to the store when it changes.
  const lastCallback = useRef(null);
  lastCallback.current = callback;

  const lastResult = useRef(null);
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
      forceUpdate();
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

module.exports = useStore;
