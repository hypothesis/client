'use strict';

var immutable = require('seamless-immutable');

var annotationUIFactory = require('../annotation-ui');
var annotationFixtures = require('./annotation-fixtures');
var metadata = require('../annotation-metadata');
var unroll = require('./util').unroll;
var uiConstants = require('../ui-constants');

var defaultAnnotation = annotationFixtures.defaultAnnotation;
var newAnnotation = annotationFixtures.newAnnotation;

var fixtures = immutable({
  pair: [
    Object.assign(defaultAnnotation(), {id: 1, $$tag: 't1'}),
    Object.assign(defaultAnnotation(), {id: 2, $$tag: 't2'}),
  ],
  newPair: [
    Object.assign(newAnnotation(), {$$tag: 't1'}),
    Object.assign(newAnnotation(), {$$tag: 't2'}),
  ],
});

describe('annotationUI', function () {
  var annotationUI;
  var fakeRootScope;

  beforeEach(function () {
    fakeRootScope = {$applyAsync: sinon.stub()};
    annotationUI = annotationUIFactory(fakeRootScope, {});
  });

  describe('initialization', function () {
    it('does not set a selection when settings.annotations is null', function () {
      assert.isFalse(annotationUI.hasSelectedAnnotations());
      assert.equal(Object.keys(annotationUI.getState().expanded).length, 0);
    });

    it('sets the selection when settings.annotations is set', function () {
      annotationUI = annotationUIFactory(fakeRootScope, {annotations: 'testid'});
      assert.deepEqual(annotationUI.getState().selectedAnnotationMap, {
        testid: true,
      });
    });

    it('expands the selected annotations when settings.annotations is set', function () {
      annotationUI = annotationUIFactory(fakeRootScope, {annotations: 'testid'});
      assert.deepEqual(annotationUI.getState().expanded, {
        testid: true,
      });
    });
  });

  describe('#addAnnotations()', function () {
    var ANCHOR_TIME_LIMIT = 1000;
    var clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    it('adds annotations not in the store', function () {
      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      assert.deepEqual(annotationUI.getState().annotations, [annot]);
    });

    it('updates annotations with matching IDs in the store', function () {
      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      var update = Object.assign({}, defaultAnnotation(), {text: 'update'});
      annotationUI.addAnnotations([update]);

      var updatedAnnot = annotationUI.getState().annotations[0];
      assert.equal(updatedAnnot.text, 'update');
    });

    it('updates annotations with matching tags in the store', function () {
      var annot = newAnnotation();
      annot.$$tag = 'local-tag';
      annotationUI.addAnnotations([annot]);

      var saved = Object.assign({}, annot, {id: 'server-id'});
      annotationUI.addAnnotations([saved]);

      var annots = annotationUI.getState().annotations;
      assert.equal(annots.length, 1);
      assert.equal(annots[0].id, 'server-id');
    });

    // We add temporary created and updated timestamps to annotations to ensure
    // that they sort correctly in the sidebar. These fields are ignored by the
    // server.
    it('adds created/updated timestamps to new annotations', function () {
      var now = new Date();
      var nowStr = now.toISOString();

      annotationUI.addAnnotations([newAnnotation()], now);
      var annot = annotationUI.getState().annotations[0];

      assert.equal(annot.created, nowStr);
      assert.equal(annot.updated, nowStr);
    });

    it('does not overwrite existing created/updated timestamps in new annotations', function () {
      var now = new Date();
      var annot = newAnnotation();
      annot.created = '2000-01-01T01:02:03Z';
      annot.updated = '2000-01-01T04:05:06Z';

      annotationUI.addAnnotations([annot], now);
      var result = annotationUI.getState().annotations[0];

      assert.equal(result.created, annot.created);
      assert.equal(result.updated, annot.updated);
    });

    it('preserves anchoring status of updated annotations', function () {
      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      annotationUI.updateAnchorStatus(annot.id, null, false /* not an orphan */);

      var update = Object.assign({}, defaultAnnotation(), {text: 'update'});
      annotationUI.addAnnotations([update]);

      var updatedAnnot = annotationUI.getState().annotations[0];
      assert.isFalse(updatedAnnot.$orphan);
    });

    it('marks annotations as orphans if they fail to anchor within a time limit', function () {
      var isOrphan = function () {
        return !!metadata.isOrphan(annotationUI.getState().annotations[0]);
      };

      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      assert.isFalse(isOrphan());

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isTrue(isOrphan());
    });

    it('does not mark annotations as orphans if they do anchor within a time limit', function () {
      var isOrphan = function () {
        return !!metadata.isOrphan(annotationUI.getState().annotations[0]);
      };

      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      annotationUI.updateAnchorStatus(annot.id, 'atag', false);

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isFalse(isOrphan());
    });

    it('does not attempt to modify orphan status if annotations are removed before anchoring timeout expires', function () {
      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      annotationUI.updateAnchorStatus(annot.id, 'atag', false);
      annotationUI.removeAnnotations([annot]);

      assert.doesNotThrow(function () {
        clock.tick(ANCHOR_TIME_LIMIT);
      });
    });

    it('does not expect annotations to anchor on the stream', function () {
      var isOrphan = function () {
        return !!metadata.isOrphan(annotationUI.getState().annotations[0]);
      };

      var annot = defaultAnnotation();
      annotationUI.setAppIsSidebar(false);
      annotationUI.addAnnotations([annot]);

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isFalse(isOrphan());
    });

    it('initializes the $orphan field for new annotations', function () {
      annotationUI.addAnnotations([newAnnotation()]);
      assert.isFalse(annotationUI.getState().annotations[0].$orphan);
    });

    it('adds multiple new annotations', function () {
      annotationUI.addAnnotations([fixtures.newPair[0]]);
      annotationUI.addAnnotations([fixtures.newPair[1]]);

      assert.equal(annotationUI.getState().annotations.length, 2);
    });
  });

  describe('#removeAnnotations()', function () {
    it('removes annotations from the current state', function () {
      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      annotationUI.removeAnnotations([annot]);
      assert.deepEqual(annotationUI.getState().annotations, []);
    });

    it('matches annotations to remove by ID', function () {
      annotationUI.addAnnotations(fixtures.pair);
      annotationUI.removeAnnotations([{id: fixtures.pair[0].id}]);
      assert.deepEqual(annotationUI.getState().annotations, [fixtures.pair[1]]);
    });

    it('matches annotations to remove by tag', function () {
      annotationUI.addAnnotations(fixtures.pair);
      annotationUI.removeAnnotations([{$$tag: fixtures.pair[0].$$tag}]);
      assert.deepEqual(annotationUI.getState().annotations, [fixtures.pair[1]]);
    });

    it('switches back to the Annotations tab when the last orphan is removed', function () {
      var orphan = Object.assign(defaultAnnotation(), {$orphan: true});
      annotationUI.addAnnotations([orphan]);
      annotationUI.selectTab(uiConstants.TAB_ORPHANS);
      annotationUI.removeAnnotations([orphan]);
      assert.equal(annotationUI.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });
  });

  describe('#clearAnnotations()', function () {
    it('removes all annotations', function () {
      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      annotationUI.clearAnnotations();
      assert.deepEqual(annotationUI.getState().annotations, []);
    });
  });

  describe('#setShowHighlights()', function () {
    unroll('sets the visibleHighlights state flag to #state', function (testCase) {
      annotationUI.setShowHighlights(testCase.state);
      assert.equal(annotationUI.getState().visibleHighlights, testCase.state);
    }, [
      {state: true},
      {state: false},
    ]);
  });

  describe('#subscribe()', function () {
    it('notifies subscribers when the UI state changes', function () {
      var listener = sinon.stub();
      annotationUI.subscribe(listener);
      annotationUI.addAnnotations([annotationFixtures.defaultAnnotation()]);
      assert.called(listener);
    });
  });

  describe('#setForceVisible()', function () {
    it('sets the visibility of the annotation', function () {
      annotationUI.setForceVisible('id1', true);
      assert.deepEqual(annotationUI.getState().forceVisible, {id1:true});
    });
  });

  describe('#setCollapsed()', function () {
    it('sets the expanded state of the annotation', function () {
      annotationUI.setCollapsed('parent_id', false);
      assert.deepEqual(annotationUI.getState().expanded, {'parent_id': true});
    });
  });

  describe('#focusAnnotations()', function () {
    it('adds the passed annotations to the focusedAnnotationMap', function () {
      annotationUI.focusAnnotations([1, 2, 3]);
      assert.deepEqual(annotationUI.getState().focusedAnnotationMap, {
        1: true, 2: true, 3: true,
      });
    });

    it('replaces any annotations originally in the map', function () {
      annotationUI.focusAnnotations([1]);
      annotationUI.focusAnnotations([2, 3]);
      assert.deepEqual(annotationUI.getState().focusedAnnotationMap, {
        2: true, 3: true,
      });
    });

    it('nulls the map if no annotations are focused', function () {
      annotationUI.focusAnnotations([1]);
      annotationUI.focusAnnotations([]);
      assert.isNull(annotationUI.getState().focusedAnnotationMap);
    });
  });

  describe('#hasSelectedAnnotations', function () {
    it('returns true if there are any selected annotations', function () {
      annotationUI.selectAnnotations([1]);
      assert.isTrue(annotationUI.hasSelectedAnnotations());
    });

    it('returns false if there are no selected annotations', function () {
      assert.isFalse(annotationUI.hasSelectedAnnotations());
    });
  });

  describe('#isAnnotationSelected', function () {
    it('returns true if the id provided is selected', function () {
      annotationUI.selectAnnotations([1]);
      assert.isTrue(annotationUI.isAnnotationSelected(1));
    });

    it('returns false if the id provided is not selected', function () {
      annotationUI.selectAnnotations([1]);
      assert.isFalse(annotationUI.isAnnotationSelected(2));
    });

    it('returns false if there are no selected annotations', function () {
      assert.isFalse(annotationUI.isAnnotationSelected(1));
    });
  });

  describe('#selectAnnotations()', function () {
    it('adds the passed annotations to the selectedAnnotationMap', function () {
      annotationUI.selectAnnotations([1, 2, 3]);
      assert.deepEqual(annotationUI.getState().selectedAnnotationMap, {
        1: true, 2: true, 3: true,
      });
    });

    it('replaces any annotations originally in the map', function () {
      annotationUI.selectAnnotations([1]);
      annotationUI.selectAnnotations([2, 3]);
      assert.deepEqual(annotationUI.getState().selectedAnnotationMap, {
        2: true, 3: true,
      });
    });

    it('nulls the map if no annotations are selected', function () {
      annotationUI.selectAnnotations([1]);
      annotationUI.selectAnnotations([]);
      assert.isNull(annotationUI.getState().selectedAnnotationMap);
    });
  });

  describe('#toggleSelectedAnnotations()', function () {
    it('adds annotations missing from the selectedAnnotationMap', function () {
      annotationUI.selectAnnotations([1, 2]);
      annotationUI.toggleSelectedAnnotations([3, 4]);
      assert.deepEqual(annotationUI.getState().selectedAnnotationMap, {
        1: true, 2: true, 3: true, 4: true,
      });
    });

    it('removes annotations already in the selectedAnnotationMap', function () {
      annotationUI.selectAnnotations([1, 3]);
      annotationUI.toggleSelectedAnnotations([1, 2]);
      assert.deepEqual(annotationUI.getState().selectedAnnotationMap, { 2: true, 3: true });
    });

    it('nulls the map if no annotations are selected', function () {
      annotationUI.selectAnnotations([1]);
      annotationUI.toggleSelectedAnnotations([1]);
      assert.isNull(annotationUI.getState().selectedAnnotationMap);
    });
  });

  describe('#removeSelectedAnnotation()', function () {
    it('removes an annotation from the selectedAnnotationMap', function () {
      annotationUI.selectAnnotations([1, 2, 3]);
      annotationUI.removeSelectedAnnotation(2);
      assert.deepEqual(annotationUI.getState().selectedAnnotationMap, {
        1: true, 3: true,
      });
    });

    it('nulls the map if no annotations are selected', function () {
      annotationUI.selectAnnotations([1]);
      annotationUI.removeSelectedAnnotation(1);
      assert.isNull(annotationUI.getState().selectedAnnotationMap);
    });
  });

  describe('#clearSelectedAnnotations()', function () {
    it('removes all annotations from the selection', function () {
      annotationUI.selectAnnotations([1]);
      annotationUI.clearSelectedAnnotations();
      assert.isNull(annotationUI.getState().selectedAnnotationMap);
    });

    it('clears the current search query', function () {
      annotationUI.setFilterQuery('foo');
      annotationUI.clearSelectedAnnotations();
      assert.isNull(annotationUI.getState().filterQuery);
    });
  });

  describe('#setFilterQuery()', function () {
    it('sets the filter query', function () {
      annotationUI.setFilterQuery('a-query');
      assert.equal(annotationUI.getState().filterQuery, 'a-query');
    });

    it('resets the force-visible and expanded sets', function () {
      annotationUI.setForceVisible('123', true);
      annotationUI.setCollapsed('456', false);
      annotationUI.setFilterQuery('some-query');
      assert.deepEqual(annotationUI.getState().forceVisible, {});
      assert.deepEqual(annotationUI.getState().expanded, {});
    });
  });

  describe('#highlightAnnotations()', function () {
    it('sets the highlighted annotations', function () {
      annotationUI.highlightAnnotations(['id1', 'id2']);
      assert.deepEqual(annotationUI.getState().highlighted, ['id1', 'id2']);
    });
  });

  describe('#selectTab()', function () {
    it('sets the selected tab', function () {
      annotationUI.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.equal(annotationUI.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('ignores junk tag names', function () {
      annotationUI.selectTab('flibbertigibbert');
      assert.equal(annotationUI.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('allows sorting annotations by time and document location', function () {
      annotationUI.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.deepEqual(annotationUI.getState().sortKeysAvailable, ['Newest', 'Oldest', 'Location']);
    });

    it('allows sorting page notes by time', function () {
      annotationUI.selectTab(uiConstants.TAB_NOTES);
      assert.deepEqual(annotationUI.getState().sortKeysAvailable, ['Newest', 'Oldest']);
    });

    it('allows sorting orphans by time and document location', function () {
      annotationUI.selectTab(uiConstants.TAB_ORPHANS);
      assert.deepEqual(annotationUI.getState().sortKeysAvailable, ['Newest', 'Oldest', 'Location']);
    });

    it('sorts annotations by document location by default', function () {
      annotationUI.selectTab(uiConstants.TAB_ANNOTATIONS);
      assert.deepEqual(annotationUI.getState().sortKey, 'Location');
    });

    it('sorts page notes from oldest to newest by default', function () {
      annotationUI.selectTab(uiConstants.TAB_NOTES);
      assert.deepEqual(annotationUI.getState().sortKey, 'Oldest');
    });

    it('sorts orphans by document location by default', function () {
      annotationUI.selectTab(uiConstants.TAB_ORPHANS);
      assert.deepEqual(annotationUI.getState().sortKey, 'Location');
    });

    it('does not reset the sort key unless necessary', function () {
      // Select the tab, setting sort key to 'Oldest', and then manually
      // override the sort key.
      annotationUI.selectTab(uiConstants.TAB_NOTES);
      annotationUI.setSortKey('Newest');

      annotationUI.selectTab(uiConstants.TAB_NOTES);

      assert.equal(annotationUI.getState().sortKey, 'Newest');
    });
  });

  describe('#updatingAnchorStatus', function () {
    it("updates the annotation's tag", function () {
      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      annotationUI.updateAnchorStatus(annot.id, 'atag', true);
      assert.equal(annotationUI.getState().annotations[0].$$tag, 'atag');
    });

    it("updates the annotation's orphan flag", function () {
      var annot = defaultAnnotation();
      annotationUI.addAnnotations([annot]);
      annotationUI.updateAnchorStatus(annot.id, 'atag', true);
      assert.equal(annotationUI.getState().annotations[0].$orphan, true);
    });

    it('updates annotations by tag', function () {
      annotationUI.addAnnotations(fixtures.newPair);
      annotationUI.updateAnchorStatus(null, 't2', true);

      var annots = annotationUI.getState().annotations;
      assert.isFalse(annots[0].$orphan);
      assert.isTrue(annots[1].$orphan);
    });
  });
});
