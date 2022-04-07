/**
 * Helper function for cases in which logically a reference is definitely
 * not nullish, but TS can't infer that correctly. This will cast the `arg`
 * and appease type-checking.
 *
 * @template T
 * @param {T} arg
 */
export function notNull(arg) {
  return /** @type {NonNullable<T>} */ (arg);
}

/**
 * @template T
 * @typedef {import('preact').Ref<T>} Ref
 */

/**
 * Helper for downcasting a ref to a more specific type, where that is safe
 * to do.
 *
 * This is mainly useful to cast a generic `Ref<HTMLElement>` to a more specific
 * element type (eg. `Ref<HTMLDivElement>`) for use with the `ref` prop of a JSX element.
 * Since Preact only writes to the `ref` prop, such a cast is safe.
 *
 * @template T
 * @template {T} U
 * @param {Ref<T>|undefined} ref
 * @return {Ref<U>|undefined}
 */
export function downcastRef(ref) {
  return /** @type {Ref<U>|undefined} */ (ref);
}
