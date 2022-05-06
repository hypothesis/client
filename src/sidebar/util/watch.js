/**
 * Watch a data source for changes to a subset of its data.
 *
 * `watch` subscribes to change notifications from a data source, computes
 * values using the data in it, and runs a callback with the current and
 * previous computed values each time the computed result changes.
 *
 * @example
 *   const unsubscribe = watch(
 *     store.subscribe,
 *
 *     // Extract some data of interest from the store.
 *     () => store.getValue(),
 *
 *     // Callback that is invoked each time the extracted data changes.
 *     (currentValue, prevValue) => { ... }
 *   );
 *   unsubcribe(); // Remove the subscription
 *
 * To watch multiple values, make {@link getValue} return an array and set
 * {@link compare} to a function that compares each element of the array:
 *
 * @example
 *   watch(
 *     store.subscribe,
 *     () => [store.getValueA(), store.getValueB()],
 *
 *     ([currentValueA, currentValueB], [prevValueA, prevValueB]) => { ... },
 *
 *     // Compare each element of the result
 *     shallowEqual,
 *   );
 *
 * @template T
 * @param {(callback: () => void) => VoidFunction} subscribe - Function to
 *   subscribe to changes from the data source.
 * @param {() => T} getValue - Callback that extracts information of interest
 *   from the data source.
 * @param {(current: T, previous: T) => void} callback -
 *   A callback that receives the data extracted by `getValue`. It is called
 *   each time the result of `getValue` changes.
 * @param {((current: T, previous: T) => boolean)} [compare] -
 *   Comparison function that tests whether the results of two `getValue` calls
 *   are equal. If omitted, a strict equality check is used
 * @return {VoidFunction} - Return value of `subscribe`
 */
export function watch(subscribe, getValue, callback, compare) {
  let prevValue = getValue();
  const unsubscribe = subscribe(() => {
    const currentValue = getValue();
    if (
      compare ? compare(currentValue, prevValue) : currentValue === prevValue
    ) {
      return;
    }

    // Save and then update `prevValues` before invoking `callback` in case
    // `callback` triggers another update.
    const savedPrevValue = prevValue;
    prevValue = currentValue;

    callback(currentValue, savedPrevValue);
  });

  return unsubscribe;
}
