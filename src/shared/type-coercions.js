/**
 * Type conversion methods that coerce incoming configuration values to an
 * expected type or format that other parts of the UI may make assumptions
 * on. This is needed for incoming configuration values that are otherwise
 * not sanitized.
 *
 * Note that if the values passed are plain javascript values (such as ones
 * produced from JSON.parse), then these methods do not throw errors.
 */

/**
 * Returns the value as a string or an empty string if the
 * value undefined, null or otherwise falsely.
 *
 * @param {any} value - Initial value
 */
function toStringShim(value) {
  if (value && typeof value.toString === 'function') {
    return value.toString();
  }
  return '';
}

/**
 * Returns either an string or null.
 *
 * @type {(value: any) => string|null}
 */
toStringShim.orNull = value => (value === null ? null : toStringShim(value));

/**
 * Returns either an integer or NaN.
 *
 * @param {any} value - Initial value
 */
function toIntegerShim(value) {
  return parseInt(value);
}

/**
 * Returns either an integer or null.
 *
 * @type {(value: any) => number|null}
 */
toIntegerShim.orNull = value => (value === null ? null : toIntegerShim(value));

/**
 * Returns a boolean.
 *
 * @param {any} value - Initial value
 */
function toBooleanShim(value) {
  if (typeof value === 'string') {
    if (value.trim().toLocaleLowerCase() === 'false') {
      // "false", "False", " false", "FALSE" all return false
      return false;
    }
  }
  const numericalVal = Number(value);
  if (!isNaN(numericalVal)) {
    return Boolean(numericalVal);
  }
  // Any non numerical or falsely string should return true, otherwise return false
  return typeof value === 'string';
}

/**
 * Returns either an boolean or null.
 *
 * @type {(value: any) => boolean|null}
 */
toBooleanShim.orNull = value => (value === null ? null : toBooleanShim(value));

/**
 * Returns the value from the custom formatter.
 *
 * Usage:
 *
 *  toCustom(value => {
 *    return {
 *       foo: coercions.toString(value.foo),
 *       bar: coercions.toInteger(value.bar),
 *    };
 *  }).orNull
 *
 * @param {(value: any) => any} callback - Custom coercion formatter.
 */
function customShim(callback) {
  /**
   * Custom callback shim.
   *
   * @param {any} value - Initial value
   */
  function customCallback(value) {
    return callback(value);
  }
  customCallback.orNull = value => {
    return value === null ? null : customCallback(value);
  };
  return customCallback;
}

/**
 * Returns either the `value` param if its an object, or an empty object.
 *
 * @param {any} value - Initial value
 */
function toObjectShim(value) {
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  // Don't attempt to fix the values, just ensure type correctness
  return {};
}

/**
 * Returns either an object or null.
 *
 * @type {(value: any) => Object|null}
 */
toObjectShim.orNull = value => (value === null ? null : toObjectShim(value));

/**
 * Returns the value from the custom `shape` formatter.  This is different
 * than `toCustom` in that this ensures the value is an object type before
 * the custom shape formatter is run.
 *
 * Usage:
 *
 *  toObject.shape(value => {
 *    return {
 *       foo: coercions.toString(value.foo),
 *       bar: coercions.toInteger(value.bar),
 *    };
 *  })
 *
 * @param {(value: any) => Object} shape - Custom coercion formatter.
 */
toObjectShim.shape = shape => {
  /**
   * Custom object shim.
   *
   * @param {any} value - Initial value
   */
  function toObjectShapeShim(value) {
    return shape(toObjectShim(value));
  }
  /**
   * Returns either the custom `shape` formatter value or null.
   *
   * Usage:
   *
   *  toObject.shape(value => {
   *    ...
   *  }).orNull
   *
   * @type {(value: any) => Object|null}
   */
  toObjectShapeShim.orNull = value =>
    value === null ? null : toObjectShapeShim(value);
  return toObjectShapeShim;
};

// Exported coercion types
const coercions = {
  toString: toStringShim,
  toInteger: toIntegerShim,
  toObject: toObjectShim,
  toBoolean: toBooleanShim,
  custom: customShim,
  any: v => v,
};

export default coercions;
