'use strict';

const annotations = require('../annotations');
const createStoreFromModules = require('../../create-store');
const drafts = require('../drafts');
const fixtures = require('../../../test/annotation-fixtures');
const selection = require('../selection');
const uiConstants = require('../../../ui-constants');
const unroll = require('../../../../shared/test/util').unroll;

const { actions, selectors } = annotations;

/**
 * Create a Redux store which handles annotation, selection and draft actions.
 */
function createStore() {
  return createStoreFromModules([annotations, selection, drafts], [{}, {}, {}]);
}

// Tests for most of the functionality in reducers/annotations.js are currently
// in the tests for the whole Redux store

describe('annotations reducer', function() {
  describe('isWaitingToAnchorAnnotations', () => {
    it('returns true if there are unanchored annotations', () => {
      const unanchored = Object.assign(fixtures.oldAnnotation(), {
        $orphan: 'undefined',
      });
      const state = {
        annotations: [unanchored, fixtures.defaultAnnotation()],
      };
      assert.isTrue(selectors.isWaitingToAnchorAnnotations(state));
    });

    it('returns false if all annotations are anchored', () => {
      const state = {
        annotations: [
          Object.assign(fixtures.oldPageNote(), { $orphan: false }),
          Object.assign(fixtures.defaultAnnotation(), { $orphan: false }),
        ],
      };
      assert.isFalse(selectors.isWaitingToAnchorAnnotations(state));
    });
  });

  describe('noteCount', () => {
    it('returns number of page notes', () => {
      const state = {
        annotations: [
          fixtures.oldPageNote(),
          fixtures.oldAnnotation(),
          fixtures.defaultAnnotation(),
        ],
      };
      assert.deepEqual(selectors.noteCount(state), 1);
    });
  });

  describe('annotationCount', () => {
    it('returns number of annotations', () => {
      const state = {
        annotations: [
          fixtures.oldPageNote(),
          fixtures.oldAnnotation(),
          fixtures.defaultAnnotation(),
        ],
      };
      assert.deepEqual(selectors.annotationCount(state), 2);
    });
  });

  describe('orphanCount', () => {
    it('returns number of orphaned annotations', () => {
      const orphan = Object.assign(fixtures.oldAnnotation(), { $orphan: true });
      const state = {
        annotations: [
          orphan,
          fixtures.oldAnnotation(),
          fixtures.defaultAnnotation(),
        ],
      };
      assert.deepEqual(selectors.orphanCount(state), 1);
    });
  });

  describe('#savedAnnotations', function() {
    const savedAnnotations = selectors.savedAnnotations;

    it('returns annotations which are saved', function() {
      const state = {
        annotations: [fixtures.newAnnotation(), fixtures.defaultAnnotation()],
      };
      assert.deepEqual(savedAnnotations(state), [fixtures.defaultAnnotation()]);
    });
  });

  describe('#findIDsForTags', function() {
    const findIDsForTags = selectors.findIDsForTags;

    it('returns the IDs corresponding to the provided local tags', function() {
      const ann = fixtures.defaultAnnotation();
      const state = {
        annotations: [Object.assign(ann, { $tag: 't1' })],
      };
      assert.deepEqual(findIDsForTags(state, ['t1']), [ann.id]);
    });

    it('does not return IDs for annotations that do not have an ID', function() {
      const ann = fixtures.newAnnotation();
      const state = {
        annotations: [Object.assign(ann, { $tag: 't1' })],
      };
      assert.deepEqual(findIDsForTags(state, ['t1']), []);
    });
  });

  describe('#hideAnnotation', function() {
    it('sets the `hidden` state to `true`', function() {
      const store = createStore();
      const ann = fixtures.moderatedAnnotation({ hidden: false });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.hideAnnotation(ann.id));

      const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, true);
    });
  });

  describe('#unhideAnnotation', function() {
    it('sets the `hidden` state to `false`', function() {
      const store = createStore();
      const ann = fixtures.moderatedAnnotation({ hidden: true });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.unhideAnnotation(ann.id));

      const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, false);
    });
  });

  describe('#removeAnnotations', function() {
    it('removes the annotation', function() {
      const store = createStore();
      const ann = fixtures.defaultAnnotation();
      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.removeAnnotations([ann]));
      assert.equal(store.getState().annotations.length, 0);
    });
  });

  describe('#updateFlagStatus', function() {
    unroll(
      'updates the flagged status of an annotation',
      function(testCase) {
        const store = createStore();
        const ann = fixtures.defaultAnnotation();
        ann.flagged = testCase.wasFlagged;
        ann.moderation = testCase.oldModeration;

        store.dispatch(actions.addAnnotations([ann]));
        store.dispatch(actions.updateFlagStatus(ann.id, testCase.nowFlagged));

        const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
        assert.equal(storeAnn.flagged, testCase.nowFlagged);
        assert.deepEqual(storeAnn.moderation, testCase.newModeration);
      },
      [
        {
          // Non-moderator flags annotation
          wasFlagged: false,
          nowFlagged: true,
          oldModeration: undefined,
          newModeration: undefined,
        },
        {
          // Non-moderator un-flags annotation
          wasFlagged: true,
          nowFlagged: false,
          oldModeration: undefined,
          newModeration: undefined,
        },
        {
          // Moderator un-flags an already unflagged annotation
          wasFlagged: false,
          nowFlagged: false,
          oldModeration: { flagCount: 1 },
          newModeration: { flagCount: 1 },
        },
        {
          // Moderator flags an already flagged annotation
          wasFlagged: true,
          nowFlagged: true,
          oldModeration: { flagCount: 1 },
          newModeration: { flagCount: 1 },
        },
        {
          // Moderator flags annotation
          wasFlagged: false,
          nowFlagged: true,
          oldModeration: { flagCount: 0 },
          newModeration: { flagCount: 1 },
        },
        {
          // Moderator un-flags annotation
          wasFlagged: true,
          nowFlagged: false,
          oldModeration: { flagCount: 1 },
          newModeration: { flagCount: 0 },
        },
      ]
    );
  });

  describe('#createAnnotation', function() {
    it('should create an annotation', function() {
      const store = createStore();
      const ann = fixtures.oldAnnotation();
      store.dispatch(actions.createAnnotation(ann));
      assert.equal(
        selectors.findAnnotationByID(store.getState(), ann.id).id,
        ann.id
      );
    });

    it('should change tab focus to TAB_ANNOTATIONS when a new annotation is created', function() {
      const store = createStore();
      store.dispatch(actions.createAnnotation(fixtures.oldAnnotation()));
      assert.equal(store.getState().selectedTab, uiConstants.TAB_ANNOTATIONS);
    });

    it('should change tab focus to TAB_NOTES when a new note annotation is created', function() {
      const store = createStore();
      store.dispatch(actions.createAnnotation(fixtures.oldPageNote()));
      assert.equal(store.getState().selectedTab, uiConstants.TAB_NOTES);
    });

    it('should expand parent of created annotation', function() {
      const store = createStore();
      store.dispatch(
        actions.addAnnotations([
          {
            id: 'annotation_id',
            $highlight: undefined,
            target: [{ source: 'source', selector: [] }],
            references: [],
            text: 'This is my annotation',
            tags: ['tag_1', 'tag_2'],
          },
        ])
      );
      // Collapse the parent.
      store.dispatch(selection.actions.setCollapsed('annotation_id', true));
      // Creating a new child annotation should expand its parent.
      store.dispatch(
        actions.createAnnotation({
          highlight: undefined,
          target: [{ source: 'http://example.org' }],
          references: ['annotation_id'],
          text: '',
          tags: [],
        })
      );
      assert.isTrue(store.getState().expanded.annotation_id);
    });
  });
});
