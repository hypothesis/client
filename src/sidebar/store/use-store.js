/* global process */

import { useEffect, useRef, useReducer } from 'preact/hooks';
import shallowEqual from 'shallowequal';

import warnOnce from '../../shared/warn-once';
import { useService } from '../util/service-context';

/** @typedef {import("redux").Store} Store */

/** @typedef {import("./index").SidebarStore} SidebarStore */

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

/**
 * Result of a cached store selector method call.
 */
class CacheEntry {
  /**
   * @param {string} name - Method name
   * @param {Function} method - Method implementation
   * @param {any[]} args - Arguments to the selector
   * @param {any} result - Result of the invocation
   */
  constructor(name, method, args, result) {
    this.name = name;
    this.method = method;
    this.args = args;
    this.result = result;
  }

  /**
   * @param {string} name
   * @param {any[]} args
   */
  matches(name, args) {
    return (
      this.name === name && this.args.every((value, i) => args[i] === value)
    );
  }
}

/**
 * Return a wrapper around the `store` service that UI components can use to
 * extract data from the store and call actions on it.
 *
 * Unlike using the `store` service directly, the wrapper tracks what data from
 * the store the current component uses and re-renders the component when it
 * changes.
 *
 * The returned wrapper has the same API as the store itself.
 *
 * @example
 *   function MyComponent() {
 *     const store = useStoreProxy();
 *     const currentUser = store.currentUser();
 *
 *     return (
 *       <div>
 *         Current user: {currentUser}.
 *         <button onClick={() => store.logOut()}>Log out</button>
 *       </div>
 *     );
 *   }
 *
 * @return {SidebarStore}
 */
export function useStoreProxy() {
  const store = useService('store');

  // Hack to trigger a component re-render.
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Cache of store method calls made by the current UI component and associated
  // results. This is currently just an array on the assumption that it will
  // only have a small number of entries. It could be changed to a map keyed
  // by method name to handle many entries better.
  const cacheRef = useRef(/** @type {CacheEntry[]} */ ([]));
  const cache = cacheRef.current;

  // Create the wrapper around the store.
  const proxy = useRef(/** @type {SidebarStore|null} */ (null));
  if (!proxy.current) {
    // Cached method wrappers.
    const wrappedMethods = {};

    /**
     * @param {typeof store} target
     * @param {string} prop
     */
    const get = (target, prop) => {
      const original = target[prop];
      if (typeof original !== 'function') {
        return original;
      }

      // Check for pre-existing method wrapper.
      let wrapped = wrappedMethods[prop];
      if (wrapped) {
        return wrapped;
      }

      // Create method wrapper.
      wrapped = (...args) => {
        const cacheEntry = cache.find(entry => entry.matches(prop, args));
        if (cacheEntry) {
          return cacheEntry.result;
        }

        // Call the original method. It may be a selector that does not modify
        // the store but returns a result, or an action that modifies the state.
        const prevState = store.getState();
        const result = original.apply(target, args);
        const newState = store.getState();

        if (prevState === newState) {
          cache.push(new CacheEntry(prop, original, args, result));
        }
        return result;
      };
      wrappedMethods[prop] = wrapped;

      return wrapped;
    };

    proxy.current = new Proxy(store, { get });
  }

  // Register a subscriber which clears cache and re-renders component when
  // relevant store state changes.
  useEffect(() => {
    const cleanup = store.subscribe(() => {
      const invalidEntry = cache.find(
        // nb. A potential problem here is that the method arguments may refer
        // to things which no longer exist (for example, an object ID for an object
        // which has been unloaded). It is assumed that store selector methods are
        // robust to this.
        entry => entry.method.apply(store, entry.args) !== entry.result
      );

      if (invalidEntry) {
        // We currently just invalidate the entire cache when any entry becomes
        // invalid, but we could do more fine-grained checks.
        cache.splice(0, cache.length);
        forceUpdate(0);
      }
    });
    return cleanup;
  }, [cache, store]);

  return proxy.current;
}
