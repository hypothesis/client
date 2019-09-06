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

  describe('isFetchingAnnotations', () => {
    it('returns false with the initial state', () => {
      assert.equal(store.isFetchingAnnotations(), false);
    });

    it('returns true when API requests are in flight', () => {
      store.annotationFetchStarted();
      assert.equal(store.isFetchingAnnotations(), true);
    });

    it('returns false when all requests end', () => {
      store.annotationFetchStarted();
      store.annotationFetchStarted();
      store.annotationFetchFinished();

      assert.equal(store.isFetchingAnnotations(), true);

      store.annotationFetchFinished();

      assert.equal(store.isFetchingAnnotations(), false);
    });
  });

  it('defaults `activeAnnotationFetches` counter to zero', () => {
    assert.equal(store.getState().activity.activeAnnotationFetches, 0);
  });

  describe('annotationFetchFinished', () => {
    it('triggers an error if no requests are in flight', () => {
      assert.throws(() => {
        store.annotationFetchFinished();
      });
    });

    it('increments `activeAnnotationFetches` counter when a new annotation fetch is started', () => {
      store.annotationFetchStarted();

      assert.equal(store.getState().activity.activeAnnotationFetches, 1);
    });
  });

  describe('annotationFetchStarted', () => {
    it('triggers an error if no requests are in flight', () => {
      assert.throws(() => {
        store.annotationFetchFinished();
      });
    });

    it('decrements `activeAnnotationFetches` counter when an annotation fetch is finished', () => {
      store.annotationFetchStarted();

      store.annotationFetchFinished();

      assert.equal(store.getState().activity.activeAnnotationFetches, 0);
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
