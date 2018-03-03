'use strict';

/**
 * Monkey-patch `object` to observe calls to `method`.
 *
 * Replaces `object[method]` with a wrapper which calls the original method and
 * then passes the arguments to the callback. Returns a function which undoes
 * the patch.
 *
 * @param {Object} object
 * @param {string} method
 * @param {Function} callback
 * @return {Function} Function which removes the patch
 */
function interceptMethod(object, method, callback) {
  let enabled = true;

  const origMethod = object[method];
  function wrapper(...args) {
    const result = origMethod.call(object, ...args);
    if (enabled) {
      callback(...args);
    }
    return result;
  }
  object[method] = wrapper;

  // Remove the intercept if nobody else has also tried to monkey-patch in the
  // meantime. If they have, just stop the callback being executed.
  function removeIntercept() {
    enabled = false;
    if (object[method] === wrapper) {
      object[method] = origMethod;
    }
  }

  return removeIntercept;
}

module.exports = interceptMethod;
