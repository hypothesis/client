import * as annotationFixtures from '../../test/annotation-fixtures';
import uiConstants from '../../ui-constants';
import storeFactory from '../index';
import immutable from '../../util/immutable';

const defaultAnnotation = annotationFixtures.defaultAnnotation;
const newAnnotation = annotationFixtures.newAnnotation;

const fixtures = immutable({
  pair: [
    Object.assign(defaultAnnotation(), { id: 1, $tag: 't1' }),
    Object.assign(defaultAnnotation(), { id: 2, $tag: 't2' }),
  ],
  newPair: [
    Object.assign(newAnnotation(), { $tag: 't1' }),
    Object.assign(newAnnotation(), { $tag: 't2' }),
  ],
});

describe('store', function () {
  let store;

  function tagForID(id) {
    const storeAnn = store.findAnnotationByID(id);
    if (!storeAnn) {
      throw new Error(`No annotation with ID ${id}`);
    }
    return storeAnn.$tag;
  }

  beforeEach(function () {
    store = storeFactory({});
  });

  describe('initialization', function () {
    it('does not set a selection when settings.annotations is null', function () {
      assert.isFalse(store.hasSelectedAnnotations());
      assert.equal(Object.keys(store.expandedThreads()).length, 0);
    });

    it('sets the selection when settings.annotations is set', function () {
      store = storeFactory({ annotations: 'testid' });
      assert.deepEqual(store.getSelectedAnnotationMap(), {
        testid: true,
      });
    });

    it('expands the selected annotations when settings.annotations is set', function () {
      store = storeFactory({ annotations: 'testid' });
      assert.deepEqual(store.expandedThreads(), {
        testid: true,
      });
    });
  });

  describe('clearSelection', () => {
    // Test clearSelection here over the entire store as it triggers the
    // CLEAR_SELECTION action in multiple store modules.
    it('sets `selectedAnnotationMap` to null', () => {
      store.clearSelection();
      assert.isNull(store.getSelectedAnnotationMap());
    });

    it('sets `filterQuery` to null', () => {
      store.clearSelection();
      assert.isNull(store.getState().selection.filterQuery);
    });

    it('sets `directLinkedGroupFetchFailed` to false', () => {
      store.clearSelection();
      assert.isFalse(
        store.getState().directLinked.directLinkedGroupFetchFailed
      );
    });

    it('sets `directLinkedAnnotationId` to null', () => {
      store.clearSelection();
      assert.isNull(store.getState().directLinked.directLinkedAnnotationId);
    });

    it('sets `directLinkedGroupId` to null', () => {
      store.clearSelection();
      assert.isNull(store.getState().directLinked.directLinkedGroupId);
    });

    it('sets `sortKey` to default annotation sort key if set to Orphans', () => {
      store.selectTab(uiConstants.TAB_ORPHANS);
      store.clearSelection();
      assert.equal(store.getState().selection.sortKey, 'Location');
    });

    it('sets `sortKeysAvailable` to available annotation sort keys if set to Orphans', () => {
      store.selectTab(uiConstants.TAB_ORPHANS);
      store.clearSelection();
      assert.deepEqual(store.getState().selection.sortKeysAvailable, [
        'Newest',
        'Oldest',
        'Location',
      ]);
    });

    it('sets `selectedTab` to Annotations if set to Orphans', () => {
      store.selectTab(uiConstants.TAB_ORPHANS);
      store.clearSelection();
      assert.equal(
        store.getState().selection.selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
    });

    it('does not change `selectedTab` if set to something other than Orphans', () => {
      store.selectTab(uiConstants.TAB_NOTES);
      store.clearSelection();
      assert.equal(
        store.getState().selection.selectedTab,
        uiConstants.TAB_NOTES
      );
    });
  });

  describe('#removeAnnotations()', function () {
    it('removes annotations from the current state', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.removeAnnotations([annot]);
      assert.deepEqual(store.getState().annotations.annotations, []);
    });

    it('matches annotations to remove by ID', function () {
      store.addAnnotations(fixtures.pair);
      store.removeAnnotations([{ id: fixtures.pair[0].id }]);

      const ids = store.getState().annotations.annotations.map(function (a) {
        return a.id;
      });
      assert.deepEqual(ids, [fixtures.pair[1].id]);
    });

    it('matches annotations to remove by tag', function () {
      store.addAnnotations(fixtures.pair);
      store.removeAnnotations([{ $tag: fixtures.pair[0].$tag }]);

      const tags = store.getState().annotations.annotations.map(function (a) {
        return a.$tag;
      });
      assert.deepEqual(tags, [fixtures.pair[1].$tag]);
    });

    it('switches back to the Annotations tab when the last orphan is removed', function () {
      const orphan = Object.assign(defaultAnnotation(), { $orphan: true });
      store.addAnnotations([orphan]);
      store.selectTab(uiConstants.TAB_ORPHANS);
      store.removeAnnotations([orphan]);
      assert.equal(
        store.getState().selection.selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
    });
  });

  describe('#clearAnnotations()', function () {
    it('removes all annotations', function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.clearAnnotations();
      assert.deepEqual(store.getState().annotations.annotations, []);
    });
  });

  describe('#setShowHighlights()', function () {
    [{ state: true }, { state: false }].forEach(testCase => {
      it(`sets the visibleHighlights state flag to ${testCase.state}`, () => {
        store.setShowHighlights(testCase.state);
        assert.equal(store.getState().viewer.visibleHighlights, testCase.state);
      });
    });
  });

  describe('#updatingAnchorStatus', function () {
    it("updates the annotation's orphan flag", function () {
      const annot = defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'orphan' });
      assert.equal(store.getState().annotations.annotations[0].$orphan, true);
    });
  });
});
