import { useLayoutEffect, useRef, useReducer } from 'preact/hooks';

/**
 * Result of a cached store selector method call.
 */
class CacheEntry {
  /**
   * @param {string} name - Method name
   * @param {Function} method - Method implementation
   * @param {unknown[]} args - Arguments to the selector
   * @param {unknown} result - Result of the invocation
   */
  constructor(name, method, args, result) {
    this.name = name;
    this.method = method;
    this.args = args;
    this.result = result;
  }

  /**
   * @param {string} name
   * @param {unknown[]} args
   */
  matches(name, args) {
    return (
      this.name === name && this.args.every((value, i) => args[i] === value)
    );
  }
}

/**
 * Return a wrapper around a store that UI components can use to read from and
 * modify data in it.
 *
 * Unlike using the store directly, the wrapper tracks what data from
 * the store the current component uses, by recording calls to selector methods,
 * and re-renders the components when the results of those calls change.
 *
 * The returned wrapper has the same API as the store itself.
 *
 * The returned wrapper does not change its identity if the store updates. This
 * means you need to be careful when using it with hooks that have dependencies,
 * such as `useMemo`, `useEffect` or `useCallback`. Given code like this:
 *
 * ```
 * const calculatedValue = useMemo(() => calculateSomething(store.getSomeValue()), [store]);
 * ```
 *
 * `calulatedValue` will not be recalculated if the result of
 * `store.getSomeValue()` changes, because the `store` reference itself does not
 * change. A workaround is to extract the values from the store and pass those
 * into the closure:
 *
 * ```
 * const someValue = store.getSomeValue();
 * const calculatedValue = useMemo(() => calculateSomething(someValue), [someValue]);
 * ```
 *
 * @example
 *   // A hook which encapsulates looking up the specific store instance,
 *   // eg. via `useContext`.
 *   function useAppStore() {
 *     // Get the store from somewhere, eg. a prop or context.
 *     const appStore = ...;
 *     return useStore(appStore);
 *   }
 *
 *   function MyComponent() {
 *     const store = useAppStore();
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
 * @template {import('./create-store').Store<object, object, object>} Store
 * @param {Store} store - The store to wrap
 * @return {Store} - A proxy with the same API as `store`
 */
export function useStore(store) {
  // Hack to trigger a component re-render.
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Cache of store method calls made by the current UI component and associated
  // results. There is one entry per combination of method and arguments.
  //
  // This is currently just an array on the assumption that it will
  // only have a small number of entries. It could be changed to a map keyed
  // by method to handle many entries better.
  const cacheRef = useRef(/** @type {CacheEntry[]} */ ([]));
  const cache = cacheRef.current;

  // Create the wrapper around the store.
  const proxy = useRef(/** @type {Store|null} */ (null));
  if (!proxy.current) {
    // Cached method wrappers.
    /** @type {Map<string, Function>} */
    const wrappedMethods = new Map();

    /**
     * @template {Store} StoreType
     * @param {StoreType} store
     * @param {keyof StoreType & string} prop
     */
    const get = (store, prop) => {
      const method = store[prop];
      if (typeof method !== 'function') {
        return method;
      }

      // Check for pre-existing method wrapper.
      let wrapped = wrappedMethods.get(prop);
      if (wrapped) {
        return wrapped;
      }

      // Create method wrapper.
      /** @param {unknown[]} args */
      wrapped = (...args) => {
        const cacheEntry = cache.find(entry => entry.matches(prop, args));
        if (cacheEntry) {
          return cacheEntry.result;
        }

        // Call the original method. It may be a selector that does not modify
        // the store but returns a result, or an action that modifies the state.
        const prevState = store.getState();
        const result = method.apply(store, args);
        const newState = store.getState();

        if (prevState === newState) {
          cache.push(new CacheEntry(prop, method, args, result));
        }
        return result;
      };
      wrappedMethods.set(prop, wrapped);

      return wrapped;
    };

    proxy.current = new Proxy(store, { get });
  }

  // Register a subscriber which clears cache and re-renders component when
  // relevant store state changes.
  useLayoutEffect(() => {
    const cleanup = store.subscribe(() => {
      const invalidEntry = cache.find(
        // nb. A potential problem here is that the method arguments may refer
        // to things which no longer exist (for example, an object ID for an object
        // which has been unloaded). It is assumed that store selector methods are
        // robust to this.
        entry => entry.method.apply(store, entry.args) !== entry.result,
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

  return /** @type {Store} */ (proxy.current);
}
