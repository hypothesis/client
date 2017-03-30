'use strict';

/**
 * Clean versions of standard functions and objects.
 *
 * This module exports unmodified versions of various standard functions that
 * may have been modified in the parent browsing context that the client is
 * injected into. For example some pages overwrite properties of global
 * JavaScript objects with broken polyfills or other problematic values, and
 * this can break our code.
 *
 * Code that runs in the parent context should always use the clean versions
 * from this module, and never the potentially modified versions from the
 * parent context.
 *
 * @module
 */

/** The value of the `id` attribute of the iframe managed by this module. */
var IFRAME_ID = 'hypothesis-clean-context';

/**
 * Append a new invisible iframe to the global document and return it.
 *
 * This iframe is used as a clean browsing context from which we can
 * extract clean copies of global functions and objects.
 *
 * Note: This function should only be called once as it always blindly creates
 * and appends a new iframe with a particular `id`.
 *
 */
function createIFrame() {
  var iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = IFRAME_ID;
  document.body.appendChild(iframe);
  return iframe;
}

/**
 * Return the iframe or `null`.
 *
 * Return the iframe that was appended to the document by `createIFrame()`,
 * or `null` if no iframe has been appended.
 *
 */
function getIFrame() {
  return document.getElementById(IFRAME_ID);
}

/**
 * Return the invisible iframe that is appended to the global document.
 *
 * Return the iframe that is used by this module, creating it and appending
 * it to the document if it isn't there already.
 *
 */
function getOrCreateIFrame() {
  return getIFrame() || createIFrame();
}

/**
 * Undo any changes this module has made to the global `document` object.
 *
 * Tests can call this to reset the shared global `document` object before
 * running each test.
 *
 */
function reset() {
  var iframe = getIFrame();
  if (iframe) {
    iframe.parentElement.removeChild(iframe);
  }
}

/**
 * Return `true` if `Function.bind` has been modified in the parent context.
 *
 * Return `false` otherwise.
 *
 */
function bindHasBeenModified() {
  var bind = Function.prototype.bind.toString();
  var call = Function.prototype.bind.call.toString();

  if (bind.indexOf('native code') === -1 || call.indexOf('native code') === -1) {
    return true;
  } else {
    return false;
  }
}

/**
 * Return a clean `Function.bind` function.
 *
 * Return the parent context's `Function.bind` if it hasn't been modified, or
 * return our own clean copy of `Function.bind` if it has.
 *
 */
function getBind() {
  if (bindHasBeenModified()) {
    return getOrCreateIFrame().contentWindow.Function.prototype.bind;
  } else {
    return Function.prototype.bind;
  }
}

module.exports = {
  get bind() { return getBind(); },
  reset: reset,
};
