'use strict';

const createStore = require('../../create-store');
const activity = require('../activity');

describe('sidebar/store/modules/activity', () => {
  let store;

  beforeEach(() => {
    store = createStore([activity]);
  });

  describe('#isLoading', () => {
    it('returns false with the initial state', () => {
      assert.equal(store.isLoading(), false);
    });

    it('returns true when API requests are in flight', () => {
      store.apiRequestStarted();
      assert.equal(store.isLoading(), true);
    });

    it('returns false when all requests end', () => {
      store.apiRequestStarted();
      store.apiRequestStarted();
      store.apiRequestFinished();

      assert.equal(store.isLoading(), true);

      store.apiRequestFinished();

      assert.equal(store.isLoading(), false);
    });
  });

  describe('#apiRequestFinished', () => {
    it('triggers an error if no requests are in flight', () => {
      assert.throws(() => {
        store.apiRequestFinished();
      });
    });
  });
});
