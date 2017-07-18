'use strict';

function storageKey(name) {
  return `hypothesis.mutex.${name}`;
}

/**
 * Return a Promise that resolves after `ms` milliseconds.
 */
function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * A service that provides mutual exclusion between instances of the client
 * running in different tabs.
 */
// @ngInject
function mutex(localStorage, random) {
  // A random unique ID for this client instance.
  var id = random.generateHexString(10);

  // Amount of time to wait between "spins" waiting for a lock to be released.
  var spinDelay = 50;

  // Maximum amount of time that a lock's expiry date can be in the future.
  var maxExpiry = 10 * 1000;

  function isLocked(lock) {
    var now = Date.now();

    return lock && typeof lock.expiresAt === 'number' &&
           lock.expiresAt > now &&
           lock.expiresAt - now < maxExpiry;
  }

  /**
   * "Spin" until a lock is released or it expires.
   *
   * @param {string} name - Name of the lock.
   * @return {Promise} - Promise that resolves when the lock is unlocked.
   */
  function spinUnlock(name) {
    // This could be optimized by listening for the "storage" event sent when the
    // current owner releases the lock.
    return delay(spinDelay).then(() => {
      var lock = localStorage.getObject(storageKey(name));
      if (!isLocked(lock)) {
        return null;
      } else {
        return spinUnlock(name);
      }
    });
  }

  /**
   * Acquire a lock with a given `name` for up to `expiry` ms.
   *
   * @param {string} name - The name of the lock.
   * @param [number] expiry - The delay (in ms) before the lock will expire.
   *   This can be at most ten seconds.
   * @return {Promise} - Promise that resolves when the lock has been
   *   aquired.
   */
  function lock(name, expiry = 5000) {
    expiry = Math.min(maxExpiry, expiry);

    var key = storageKey(name);
    var currentLock = localStorage.getObject(key);
    if (!isLocked(currentLock)) {
      // Try to acquire the lock.
      var lockDesc = { id, expiresAt: Date.now() + expiry };
      localStorage.setObject(key, lockDesc);

      // The delay here is meant to be long enough that this client will see any
      // concurrent writes to the same key by another client.
      return delay(spinDelay).then(() => {
        var newLock = localStorage.getObject(key);
        if (!newLock || (isLocked(newLock) && newLock.id !== id)) {
          // Another client tried to acquire the lock at the same time and won.
          return lock(name, expiry);
        } else {
          // We got the lock.
          return null;
        }
      });
    } else {
      // Wait for the lock to expire or be released, then try locking again.
      return spinUnlock(name).then(() => {
        return lock(name, expiry);
      });
    }
  }

  /**
   * Release a lock.
   *
   * @param {string} name - Name of the lock.
   */
  function unlock(name) {
    var key = storageKey(name);
    var lock = localStorage.getObject(key);
    if (!lock) {
      throw new Error('Lock is not held');
    }
    if (lock.id !== id) {
      throw new Error('Lock held by a different client');
    }
    localStorage.removeItem(key);
  }

  /**
   * Adjust the delay between "spins" waiting for a mutex to be unlocked.
   */
  function setSpinDelay(ms) {
    spinDelay = ms;
  }

  return {
    lock,
    unlock,
    setSpinDelay,
  };
}

module.exports = mutex;
