'use strict';

var Mutex = require('idb-mutex').default;

/**
 * A dummy mutex implementation for use in browsers where IndexedDB is not
 * available.
 */
class FallbackMutex {
  lock() {
    return Promise.resolve();
  }

  unlock() {
    return Promise.resolve();
  }
}

/**
 * A service that provides mutual exclusion between instances of the client
 * running in different tabs.
 */
// @ngInject
function mutex() {

  var mu;
  var spinDelay = 50;
  var expiry = 5000;

  function init() {
    try {
      mu = new Mutex('hyp-mutex', null, {
        spinDelay,
        expiry,
      });
    } catch (err) {
      console.warning('Using fallback mutex'); // eslint-disable-line no-console
      mu = new FallbackMutex;
    }
  }

  /**
   * Acquire the lock.
   *
   * If another client already holds the lock, the returned Promise will not
   * resolve until the lock is released or it expires.
   *
   * @return {Promise}
   */
  function lock() {
    return mu.lock();
  }

  /**
   * Release the lock.
   *
   * @return {Promise}
   */
  function unlock() {
    return mu.unlock();
  }

  /**
   * Configure how long the mutex waits between "spins" if the lock is
   * contended.
   *
   * @param {number} delay - Duration in ms.
   */
  function setSpinDelay(delay) {
    spinDelay = delay;
    init();
  }

  /**
   * Configure how soon mutex locks auto-expire.
   *
   * @param {number} delay - Duration in ms.
   */
  function setExpiry(delay) {
    expiry = delay;
    init();
  }

  init();

  return {
    lock,
    unlock,
    setExpiry,
    setSpinDelay,
  };
}

module.exports = mutex;
