/* global process */

/**
 * Freeze an object recursively.
 *
 * This only works for plain objects, arrays and objects where data is stored
 * in enumerable fields.
 */
function deepFreeze<T extends object>(object: T) {
  if (Object.isFrozen(object)) {
    return object;
  }

  Object.freeze(object);

  Object.values(object).forEach(val => {
    if (typeof val === 'object' && val !== null) {
      deepFreeze(val);
    }
  });

  return object;
}

/**
 * Prevent accidental mutations to `object` or any of its fields in debug builds.
 *
 * @template {object} T
 * @param {T} object
 * @return {T} Returns the input object
 */
export function immutable<T extends object>(object: T) {
  if (process.env.NODE_ENV === 'production') {
    return object;
  } else {
    return deepFreeze(object);
  }
}
