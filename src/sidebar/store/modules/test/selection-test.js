'use strict';

const createStore = require('../../create-store');
const selection = require('../selection');
const uiConstants = require('../../../ui-constants');

describe('selection', () => {
  let store;
  let fakeSettings = {};

  beforeEach(() => {
    store = createStore([selection], [fakeSettings]);
  });

  describe('getFirstSelectedAnnotationId', function() {
    it('returns the first selected annotation id it finds', function() {
      store.selectAnnotations([1, 2]);
      assert.equal(store.getFirstSelectedAnnotationId(), 1);
    });

    it('returns null if no selected annotation ids are found', function() {
      store.selectAnnotations([]);
      assert.isNull(store.getFirstSelectedAnnotationId());
    });
  });

  describe('setForceVisible()', function() {
    it('sets the visibility of the annotation', function() {
      store.setForceVisible('id1', true);
      assert.deepEqual(store.getState().forceVisible, { id1: true });
    });
  });

  describe('setCollapsed()', function() {
    it('sets the expanded state of the annotation', function() {
      store.setCollapsed('parent_id', false);
      assert.deepEqual(store.getState().expanded, { parent_id: true });
    });
  });

  describe('focusAnnotations()', function() {
    it('adds the passed annotations to the focusedAnnotationMap', function() {
      store.focusAnnotations([1, 2, 3]);
      assert.deepEqual(store.getState().focusedAnnotationMap, {
        1: true,
        2: true,
        3: true,
      });
    });

    it('replaces any annotations originally in the map', function() {
      store.focusAnnotations([1]);
      store.focusAnnotations([2, 3]);
      assert.deepEqual(store.getState().focusedAnnotationMap, {
        2: true,
        3: true,
      });
    });

    it('nulls the map if no annotations are focused', function() {
      store.focusAnnotations([1]);
      store.focusAnnotations([]);
      assert.isNull(store.getState().focusedAnnotationMap);
    });
  });

  describe('hasSelectedAnnotations', function() {
    it('returns true if there are any selected annotations', function() {
      store.selectAnnotations([1]);
      assert.isTrue(store.hasSelectedAnnotations());
    });

    it('returns false if there are no selected annotations', function() {
      assert.isFalse(store.hasSelectedAnnotations());
    });
  });

  describe('isAnnotationSelected', function() {
    it('returns true if the id provided is selected', function() {
      store.selectAnnotations([1]);
      assert.isTrue(store.isAnnotationSelected(1));
    });

    it('returns false if the id provided is not selected', function() {
      store.selectAnnotations([1]);
      assert.isFalse(store.isAnnotationSelected(2));
    });

    it('returns false if there are no selected annotations', function() {
      assert.isFalse(store.isAnnotationSelected(1));
    });
  });

  describe('selectAnnotations()', function() {
    it('adds the passed annotations to the selectedAnnotationMap', function() {
      store.selectAnnotations([1, 2, 3]);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        1: true,
        2: true,
        3: true,
      });
    });

    it('replaces any annotations originally in the map', function() {
      store.selectAnnotations([1]);
      store.selectAnnotations([2, 3]);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        2: true,
        3: true,
      });
    });

    it('nulls the map if no annotations are selected', function() {
      store.selectAnnotations([1]);
      store.selectAnnotations([]);
      assert.isNull(store.getState().selectedAnnotationMap);
    });
  });

  describe('toggleSelectedAnnotations()', function() {
    it('adds annotations missing from the selectedAnnotationMap', function() {
      store.selectAnnotations([1, 2]);
      store.toggleSelectedAnnotations([3, 4]);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        1: true,
        2: true,
        3: true,
        4: true,
      });
    });

    it('removes annotations already in the selectedAnnotationMap', function() {
      store.selectAnnotations([1, 3]);
      store.toggleSelectedAnnotations([1, 2]);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        2: true,
        3: true,
      });
    });

    it('nulls the map if no annotations are selected', function() {
      store.selectAnnotations([1]);
      store.toggleSelectedAnnotations([1]);
      assert.isNull(store.getState().selectedAnnotationMap);
    });
  });

  describe('removeSelectedAnnotation()', function() {
    it('removes an annotation from the selectedAnnotationMap', function() {
      store.selectAnnotations([1, 2, 3]);
      store.removeSelectedAnnotation(2);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        1: true,
        3: true,
      });
    });

    it('nulls the map if no annotations are selected', function() {
      store.selectAnnotations([1]);
      store.removeSelectedAnnotation(1);
      assert.isNull(store.getState().selectedAnnotationMap);
    });
  });

  describe('clearSelectedAnnotations()', function() {
    it('removes all annotations from the selection', function() {
      store.selectAnnotations([1]);
      store.clearSelectedAnnotations();
      assert.isNull(store.getState().selectedAnnotationMap);
    });

    it('clears the current search query', function() {
      store.setFilterQuery('foo');
      store.clearSelectedAnnotations();
      assert.isNull(store.getState().filterQuery);
    });
  });

  describe('setFilterQuery()', function() {
    it('sets the filter query', function() {
      store.setFilterQuery('a-query');
      assert.equal(store.getState().filterQuery, 'a-query');
    });

    it('resets the force-visible and expanded sets', function() {
      store.setForceVisible('123', true);
      store.setCollapsed('456', false);
      store.setFilterQuery('some-query');
      assert.deepEqual(store.getState().forceVisible, {});
      assert.deepEqual(store.getState().expanded, {});
    });
  });

  describe('highlightAnnotations()', function() {
    it('sets the highlighted annotations', function() {
      store.highlightAnnotations(['id1', 'id2']);
      assert.deepEqual(store.getState().highlighted, ['id1', 'id2']);
    });
  });

  describe('selectTab()', function() {
    it('sets the selected tab', function() {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.equal(store.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('ignores junk tag names', function() {
      store.selectTab('flibbertigibbert');
      assert.equal(store.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('allows sorting annotations by time and document location', function() {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.deepEqual(store.getState().sortKeysAvailable, [
        'Newest',
        'Oldest',
        'Location',
      ]);
    });

    it('allows sorting page notes by time', function() {
      store.selectTab(uiConstants.TAB_NOTES);
      assert.deepEqual(store.getState().sortKeysAvailable, [
        'Newest',
        'Oldest',
      ]);
    });

    it('allows sorting orphans by time and document location', function() {
      store.selectTab(uiConstants.TAB_ORPHANS);
      assert.deepEqual(store.getState().sortKeysAvailable, [
        'Newest',
        'Oldest',
        'Location',
      ]);
    });

    it('sorts annotations by document location by default', function() {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.deepEqual(store.getState().sortKey, 'Location');
    });

    it('sorts page notes from oldest to newest by default', function() {
      store.selectTab(uiConstants.TAB_NOTES);
      assert.deepEqual(store.getState().sortKey, 'Oldest');
    });

    it('sorts orphans by document location by default', function() {
      store.selectTab(uiConstants.TAB_ORPHANS);
      assert.deepEqual(store.getState().sortKey, 'Location');
    });

    it('does not reset the sort key unless necessary', function() {
      // Select the tab, setting sort key to 'Oldest', and then manually
      // override the sort key.
      store.selectTab(uiConstants.TAB_NOTES);
      store.setSortKey('Newest');

      store.selectTab(uiConstants.TAB_NOTES);

      assert.equal(store.getState().sortKey, 'Newest');
    });
  });
});
