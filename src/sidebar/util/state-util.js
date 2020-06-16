'use strict';

/**
 * Returns the documentFingerprint (DC identifier) when available in the frames state
 * @param store
 * @returns {Promise<T>}
 */
function getDocumentDCIdentifier(store) {
  function getIdentifier() {
    const state = store.getState();
    const metaFrame = state.frames.find(function (frame) {
      return frame.metadata && frame.metadata.documentFingerprint;
    });
    return metaFrame ? metaFrame.metadata.documentFingerprint : null;
  }
  return awaitStateChange(store, getIdentifier);
}

function getDCIdentifier(store) {
    const state = store.getState();
    const metaFrame = state.frames.find(function (frame) {
      return frame.metadata && frame.metadata.dc.identifier;
    });
    return metaFrame ? metaFrame.metadata.dc.identifier : null;
  }
/**
 * Return a value from app state when it meets certain criteria.
 *
 * `await` returns a Promise which resolves when a selector function,
 * which reads values from a Redux store, returns non-null.
 *
 * @param {Object} store - Redux store
 * @param {Function<T|null>} selector - Function which returns a value from the
 *   store if the criteria is met or `null` otherwise.
 * @return {Promise<T>}
 */
function awaitStateChange(store, selector) {
  const result = selector(store);
  if (result !== null) {
    return Promise.resolve(result);
  }
  return new Promise(resolve => {
    const unsubscribe = store.subscribe(() => {
      const result = selector(store);
      if (result !== null) {
        unsubscribe();
        resolve(result);
      }
    });
  });
}

module.exports = { awaitStateChange, getDocumentDCIdentifier, getDCIdentifier } ;
