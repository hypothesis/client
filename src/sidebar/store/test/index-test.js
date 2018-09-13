'use strict';

const immutable = require('seamless-immutable');

const storeFactory = require('../index');
const annotationFixtures = require('../../test/annotation-fixtures');
const metadata = require('../../annotation-metadata');
const unroll = require('../../../shared/test/util').unroll;
const uiConstants = require('../../ui-constants');

const defaultAnnotation = annotationFixtures.defaultAnnotation;
const newAnnotation = annotationFixtures.newAnnotation;
const oldPageNote = annotationFixtures.oldPageNote;

const fixtures = immutable({
  pair: [
    Object.assign(defaultAnnotation(), {id: 1, $tag: 't1'}),
    Object.assign(defaultAnnotation(), {id: 2, $tag: 't2'}),
  ],
  newPair: [
    Object.assign(newAnnotation(), {$tag: 't1'}),
    Object.assign(newAnnotation(), {$tag: 't2'}),
  ],
});

describe('store', function () {
  let store;
  let fakeRootScope;

  function tagForID(id) {
    const storeAnn = store.findAnnotationByID(id);
    if (!storeAnn) {
      throw new Error(`No annotation with ID ${id}`);
    }
    return storeAnn.$tag;
  }

  beforeEach(function () {
    fakeRootScope = {$applyAsync: sinon.stub()};
    store = storeFactory(fakeRootScope, {});
  });

  describe('initialization', function () {
    it('does not set a selection when settings.annotations is null', function () {
      assert.isFalse(store.hasSelectedAnnotations());
      assert.equal(Object.keys(store.getState().expanded).length, 0);
    });

    it('sets the selection when settings.annotations is set', function () {
      store = storeFactory(fakeRootScope, {annotations: 'testid'});
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        testid: true,
      });
    });

    it('expands the selected annotations when settings.annotations is set', function () {
      store = storeFactory(fakeRootScope, {annotations: 'testid'});
      assert.deepEqual(store.getState().expanded, {
        testid: true,
      });
    });
  });

  describe('#addAnnotations()', function () {
    const ANCHOR_TIME_LIMIT = 1000;
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    it('adds annotations not in the store', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      assert.match(store.getState().annotations,
        [sinon.match(annot)]);
    });

    it('does not change `selectedTab` state if annotations are already loaded', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      const page = oldPageNote();
      store.addAnnotations([page]);
      assert.equal(store.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('sets `selectedTab` to "note" if only page notes are present', function () {
      const page = oldPageNote();
      store.addAnnotations([page]);
      assert.equal(store.getState().selectedTab, uiConstants.TAB_NOTES);
    });

    it('leaves `selectedTab` as "annotation" if annotations and/or page notes are present', function () {
      const page = oldPageNote();
      const annot = defaultAnnotation();
      store.addAnnotations([annot, page]);
      assert.equal(store.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('assigns a local tag to annotations', function () {
      const annotA = Object.assign(defaultAnnotation(), {id: 'a1'});
      const annotB = Object.assign(defaultAnnotation(), {id: 'a2'});

      store.addAnnotations([annotA, annotB]);

      const tags = store.getState().annotations.map(function (a) {
        return a.$tag;
      });

      assert.deepEqual(tags, ['t1','t2']);
    });

    it('updates annotations with matching IDs in the store', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      const update = Object.assign({}, defaultAnnotation(), {text: 'update'});
      store.addAnnotations([update]);

      const updatedAnnot = store.getState().annotations[0];
      assert.equal(updatedAnnot.text, 'update');
    });

    it('updates annotations with matching tags in the store', function () {
      const annot = newAnnotation();
      annot.$tag = 'local-tag';
      store.addAnnotations([annot]);

      const saved = Object.assign({}, annot, {id: 'server-id'});
      store.addAnnotations([saved]);

      const annots = store.getState().annotations;
      assert.equal(annots.length, 1);
      assert.equal(annots[0].id, 'server-id');
    });

    // We add temporary created and updated timestamps to annotations to ensure
    // that they sort correctly in the sidebar. These fields are ignored by the
    // server.
    it('adds created/updated timestamps to new annotations', function () {
      const now = new Date();
      const nowStr = now.toISOString();

      store.addAnnotations([newAnnotation()], now);
      const annot = store.getState().annotations[0];

      assert.equal(annot.created, nowStr);
      assert.equal(annot.updated, nowStr);
    });

    it('does not overwrite existing created/updated timestamps in new annotations', function () {
      const now = new Date();
      const annot = newAnnotation();
      annot.created = '2000-01-01T01:02:03Z';
      annot.updated = '2000-01-01T04:05:06Z';

      store.addAnnotations([annot], now);
      const result = store.getState().annotations[0];

      assert.equal(result.created, annot.created);
      assert.equal(result.updated, annot.updated);
    });

    it('preserves anchoring status of updated annotations', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'anchored' });

      const update = Object.assign({}, defaultAnnotation(), {text: 'update'});
      store.addAnnotations([update]);

      const updatedAnnot = store.getState().annotations[0];
      assert.isFalse(updatedAnnot.$orphan);
    });

    it('sets the timeout flag on annotations that fail to anchor within a time limit', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isTrue(store.getState().annotations[0].$anchorTimeout);
    });

    it('does not set the timeout flag on annotations that do anchor within a time limit', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'anchored' });

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isFalse(store.getState().annotations[0].$anchorTimeout);
    });

    it('does not attempt to modify orphan status if annotations are removed before anchoring timeout expires', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'anchored' });
      store.removeAnnotations([annot]);

      assert.doesNotThrow(function () {
        clock.tick(ANCHOR_TIME_LIMIT);
      });
    });

    it('does not expect annotations to anchor on the stream', function () {
      const isOrphan = function () {
        return !!metadata.isOrphan(store.getState().annotations[0]);
      };

      const annot = defaultAnnotation();
      store.setAppIsSidebar(false);
      store.addAnnotations([annot]);

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isFalse(isOrphan());
    });

    it('initializes the $orphan field for new annotations', function () {
      store.addAnnotations([newAnnotation()]);
      assert.isFalse(store.getState().annotations[0].$orphan);
    });

    it('adds multiple new annotations', function () {
      store.addAnnotations([fixtures.newPair[0]]);
      store.addAnnotations([fixtures.newPair[1]]);

      assert.equal(store.getState().annotations.length, 2);
    });
  });

  describe('#removeAnnotations()', function () {
    it('removes annotations from the current state', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.removeAnnotations([annot]);
      assert.deepEqual(store.getState().annotations, []);
    });

    it('matches annotations to remove by ID', function () {
      store.addAnnotations(fixtures.pair);
      store.removeAnnotations([{id: fixtures.pair[0].id}]);

      const ids = store.getState().annotations.map(function (a) {
        return a.id;
      });
      assert.deepEqual(ids, [fixtures.pair[1].id]);
    });

    it('matches annotations to remove by tag', function () {
      store.addAnnotations(fixtures.pair);
      store.removeAnnotations([{$tag: fixtures.pair[0].$tag}]);

      const tags = store.getState().annotations.map(function (a) {
        return a.$tag;
      });
      assert.deepEqual(tags, [fixtures.pair[1].$tag]);
    });

    it('switches back to the Annotations tab when the last orphan is removed', function () {
      const orphan = Object.assign(defaultAnnotation(), {$orphan: true});
      store.addAnnotations([orphan]);
      store.selectTab(uiConstants.TAB_ORPHANS);
      store.removeAnnotations([orphan]);
      assert.equal(store.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });
  });

  describe('#clearAnnotations()', function () {
    it('removes all annotations', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.clearAnnotations();
      assert.deepEqual(store.getState().annotations, []);
    });
  });

  describe('#setShowHighlights()', function () {
    unroll('sets the visibleHighlights state flag to #state', function (testCase) {
      store.setShowHighlights(testCase.state);
      assert.equal(store.getState().visibleHighlights, testCase.state);
    }, [
      {state: true},
      {state: false},
    ]);
  });

  describe('#setForceVisible()', function () {
    it('sets the visibility of the annotation', function () {
      store.setForceVisible('id1', true);
      assert.deepEqual(store.getState().forceVisible, {id1:true});
    });
  });

  describe('#setCollapsed()', function () {
    it('sets the expanded state of the annotation', function () {
      store.setCollapsed('parent_id', false);
      assert.deepEqual(store.getState().expanded, {'parent_id': true});
    });
  });

  describe('#focusAnnotations()', function () {
    it('adds the passed annotations to the focusedAnnotationMap', function () {
      store.focusAnnotations([1, 2, 3]);
      assert.deepEqual(store.getState().focusedAnnotationMap, {
        1: true, 2: true, 3: true,
      });
    });

    it('replaces any annotations originally in the map', function () {
      store.focusAnnotations([1]);
      store.focusAnnotations([2, 3]);
      assert.deepEqual(store.getState().focusedAnnotationMap, {
        2: true, 3: true,
      });
    });

    it('nulls the map if no annotations are focused', function () {
      store.focusAnnotations([1]);
      store.focusAnnotations([]);
      assert.isNull(store.getState().focusedAnnotationMap);
    });
  });

  describe('#hasSelectedAnnotations', function () {
    it('returns true if there are any selected annotations', function () {
      store.selectAnnotations([1]);
      assert.isTrue(store.hasSelectedAnnotations());
    });

    it('returns false if there are no selected annotations', function () {
      assert.isFalse(store.hasSelectedAnnotations());
    });
  });

  describe('#isAnnotationSelected', function () {
    it('returns true if the id provided is selected', function () {
      store.selectAnnotations([1]);
      assert.isTrue(store.isAnnotationSelected(1));
    });

    it('returns false if the id provided is not selected', function () {
      store.selectAnnotations([1]);
      assert.isFalse(store.isAnnotationSelected(2));
    });

    it('returns false if there are no selected annotations', function () {
      assert.isFalse(store.isAnnotationSelected(1));
    });
  });

  describe('#selectAnnotations()', function () {
    it('adds the passed annotations to the selectedAnnotationMap', function () {
      store.selectAnnotations([1, 2, 3]);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        1: true, 2: true, 3: true,
      });
    });

    it('replaces any annotations originally in the map', function () {
      store.selectAnnotations([1]);
      store.selectAnnotations([2, 3]);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        2: true, 3: true,
      });
    });

    it('nulls the map if no annotations are selected', function () {
      store.selectAnnotations([1]);
      store.selectAnnotations([]);
      assert.isNull(store.getState().selectedAnnotationMap);
    });
  });

  describe('#toggleSelectedAnnotations()', function () {
    it('adds annotations missing from the selectedAnnotationMap', function () {
      store.selectAnnotations([1, 2]);
      store.toggleSelectedAnnotations([3, 4]);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        1: true, 2: true, 3: true, 4: true,
      });
    });

    it('removes annotations already in the selectedAnnotationMap', function () {
      store.selectAnnotations([1, 3]);
      store.toggleSelectedAnnotations([1, 2]);
      assert.deepEqual(store.getState().selectedAnnotationMap, { 2: true, 3: true });
    });

    it('nulls the map if no annotations are selected', function () {
      store.selectAnnotations([1]);
      store.toggleSelectedAnnotations([1]);
      assert.isNull(store.getState().selectedAnnotationMap);
    });
  });

  describe('#removeSelectedAnnotation()', function () {
    it('removes an annotation from the selectedAnnotationMap', function () {
      store.selectAnnotations([1, 2, 3]);
      store.removeSelectedAnnotation(2);
      assert.deepEqual(store.getState().selectedAnnotationMap, {
        1: true, 3: true,
      });
    });

    it('nulls the map if no annotations are selected', function () {
      store.selectAnnotations([1]);
      store.removeSelectedAnnotation(1);
      assert.isNull(store.getState().selectedAnnotationMap);
    });
  });

  describe('#clearSelectedAnnotations()', function () {
    it('removes all annotations from the selection', function () {
      store.selectAnnotations([1]);
      store.clearSelectedAnnotations();
      assert.isNull(store.getState().selectedAnnotationMap);
    });

    it('clears the current search query', function () {
      store.setFilterQuery('foo');
      store.clearSelectedAnnotations();
      assert.isNull(store.getState().filterQuery);
    });
  });

  describe('#setFilterQuery()', function () {
    it('sets the filter query', function () {
      store.setFilterQuery('a-query');
      assert.equal(store.getState().filterQuery, 'a-query');
    });

    it('resets the force-visible and expanded sets', function () {
      store.setForceVisible('123', true);
      store.setCollapsed('456', false);
      store.setFilterQuery('some-query');
      assert.deepEqual(store.getState().forceVisible, {});
      assert.deepEqual(store.getState().expanded, {});
    });
  });

  describe('#highlightAnnotations()', function () {
    it('sets the highlighted annotations', function () {
      store.highlightAnnotations(['id1', 'id2']);
      assert.deepEqual(store.getState().highlighted, ['id1', 'id2']);
    });
  });

  describe('#selectTab()', function () {
    it('sets the selected tab', function () {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.equal(store.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('ignores junk tag names', function () {
      store.selectTab('flibbertigibbert');
      assert.equal(store.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('allows sorting annotations by time and document location', function () {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.deepEqual(store.getState().sortKeysAvailable, ['Newest', 'Oldest', 'Location']);
    });

    it('allows sorting page notes by time', function () {
      store.selectTab(uiConstants.TAB_NOTES);
      assert.deepEqual(store.getState().sortKeysAvailable, ['Newest', 'Oldest']);
    });

    it('allows sorting orphans by time and document location', function () {
      store.selectTab(uiConstants.TAB_ORPHANS);
      assert.deepEqual(store.getState().sortKeysAvailable, ['Newest', 'Oldest', 'Location']);
    });

    it('sorts annotations by document location by default', function () {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.deepEqual(store.getState().sortKey, 'Location');
    });

    it('sorts page notes from oldest to newest by default', function () {
      store.selectTab(uiConstants.TAB_NOTES);
      assert.deepEqual(store.getState().sortKey, 'Oldest');
    });

    it('sorts orphans by document location by default', function () {
      store.selectTab(uiConstants.TAB_ORPHANS);
      assert.deepEqual(store.getState().sortKey, 'Location');
    });

    it('does not reset the sort key unless necessary', function () {
      // Select the tab, setting sort key to 'Oldest', and then manually
      // override the sort key.
      store.selectTab(uiConstants.TAB_NOTES);
      store.setSortKey('Newest');

      store.selectTab(uiConstants.TAB_NOTES);

      assert.equal(store.getState().sortKey, 'Newest');
    });
  });

  describe('#updatingAnchorStatus', function () {
    it("updates the annotation's orphan flag", function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'orphan' });
      assert.equal(store.getState().annotations[0].$orphan, true);
    });
  });
});
