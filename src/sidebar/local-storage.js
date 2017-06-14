'use strict';

/**
 * Fallback in-memory store if `localStorage` is not read/writable.
 */
class InMemoryStorage {
  constructor() {
    this._store = {};
  }

  getItem(key) {
    return (key in this._store) ? this._store[key] : null;
  }

  setItem(key, value) {
    this._store[key] = value;
  }

  removeItem(key) {
    delete this._store[key];
  }
}

/**
 * A wrapper around the `localStorage` API which provides a fallback to
 * in-memory storage in browsers that block access to `window.localStorage`.
 * in third-party iframes.
 */
// @ngInject
function localStorage($window) {
  var storage = $window.localStorage;

  try {
    // Test whether we can read/write localStorage.
    var key = 'hypothesis.testKey';
    $window.localStorage.setItem(key, key);
    $window.localStorage.getItem(key);
    $window.localStorage.removeItem(key);
  } catch (e) {
    storage = new InMemoryStorage();
  }

  return {
    getItem(key) {
      return storage.getItem(key);
    },

    getObject(key) {
      var item = storage.getItem(key);
      return item ? JSON.parse(item) : null;
    },

    setItem(key, value) {
      storage.setItem(key, value);
    },

    setObject(key, value) {
      var repr = JSON.stringify(value);
      storage.setItem(key, repr);
    },

    removeItem(key) {
      storage.removeItem(key);
    },
  };
}

module.exports = localStorage;
