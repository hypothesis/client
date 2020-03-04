import * as fixtures from '../../../test/annotation-fixtures';
import * as metadata from '../../../util/annotation-metadata';
import createStore from '../../create-store';
import annotations from '../annotations';
import route from '../route';

const { actions, selectors } = annotations;

function createTestStore() {
  return createStore([annotations, route], [{}]);
}

// Tests for most of the functionality in reducers/annotations.js are currently
// in the tests for the whole Redux store

describe('sidebar/store/modules/annotations', function() {
  describe('#addAnnotations()', function() {
    const ANCHOR_TIME_LIMIT = 1000;
    let clock;
    let store;

    function tagForID(id) {
      const storeAnn = store.findAnnotationByID(id);
      if (!storeAnn) {
        throw new Error(`No annotation with ID ${id}`);
      }
      return storeAnn.$tag;
    }

    beforeEach(function() {
      clock = sinon.useFakeTimers();
      store = createTestStore();
      store.changeRoute('sidebar', {});
    });

    afterEach(function() {
      clock.restore();
    });

    it('adds annotations not in the store', function() {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      assert.match(store.getState().annotations.annotations, [
        sinon.match(annot),
      ]);
    });

    it('assigns a local tag to annotations', function() {
      const annotA = Object.assign(fixtures.defaultAnnotation(), { id: 'a1' });
      const annotB = Object.assign(fixtures.defaultAnnotation(), { id: 'a2' });

      store.addAnnotations([annotA, annotB]);

      const tags = store.getState().annotations.annotations.map(function(a) {
        return a.$tag;
      });

      assert.deepEqual(tags, ['t1', 't2']);
    });

    it('updates annotations with matching IDs in the store', function() {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      const update = Object.assign({}, fixtures.defaultAnnotation(), {
        text: 'update',
      });
      store.addAnnotations([update]);

      const updatedAnnot = store.getState().annotations.annotations[0];
      assert.equal(updatedAnnot.text, 'update');
    });

    it('updates annotations with matching tags in the store', function() {
      const annot = fixtures.newAnnotation();
      annot.$tag = 'local-tag';
      store.addAnnotations([annot]);

      const saved = Object.assign({}, annot, { id: 'server-id' });
      store.addAnnotations([saved]);

      const annots = store.getState().annotations.annotations;
      assert.equal(annots.length, 1);
      assert.equal(annots[0].id, 'server-id');
    });

    it('preserves anchoring status of updated annotations', function() {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'anchored' });

      const update = Object.assign({}, fixtures.defaultAnnotation(), {
        text: 'update',
      });
      store.addAnnotations([update]);

      const updatedAnnot = store.getState().annotations.annotations[0];
      assert.isFalse(updatedAnnot.$orphan);
    });

    it('sets the timeout flag on annotations that fail to anchor within a time limit', function() {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isTrue(store.getState().annotations.annotations[0].$anchorTimeout);
    });

    it('does not set the timeout flag on annotations that do anchor within a time limit', function() {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'anchored' });

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isFalse(
        store.getState().annotations.annotations[0].$anchorTimeout
      );
    });

    it('does not attempt to modify orphan status if annotations are removed before anchoring timeout expires', function() {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'anchored' });
      store.removeAnnotations([annot]);

      assert.doesNotThrow(function() {
        clock.tick(ANCHOR_TIME_LIMIT);
      });
    });

    it('does not expect annotations to anchor on the stream', function() {
      const isOrphan = function() {
        return !!metadata.isOrphan(store.getState().annotations.annotations[0]);
      };

      const annot = fixtures.defaultAnnotation();
      store.changeRoute('stream', { q: 'a-query' });
      store.addAnnotations([annot]);

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isFalse(isOrphan());
    });

    it('initializes the $orphan field for new annotations', function() {
      store.addAnnotations([fixtures.newAnnotation()]);
      assert.isFalse(store.getState().annotations.annotations[0].$orphan);
    });
  });

  describe('#isWaitingToAnchorAnnotations', () => {
    it('returns true if there are unanchored annotations', () => {
      const unanchored = Object.assign(fixtures.oldAnnotation(), {
        $orphan: 'undefined',
      });
      const state = {
        annotations: {
          annotations: [unanchored, fixtures.defaultAnnotation()],
        },
      };
      assert.isTrue(selectors.isWaitingToAnchorAnnotations(state));
    });

    it('returns false if all annotations are anchored', () => {
      const state = {
        annotations: {
          annotations: [
            Object.assign(fixtures.oldPageNote(), { $orphan: false }),
            Object.assign(fixtures.defaultAnnotation(), { $orphan: false }),
          ],
        },
      };
      assert.isFalse(selectors.isWaitingToAnchorAnnotations(state));
    });
  });

  describe('newAnnotations', () => {
    [
      {
        annotations: [
          fixtures.oldAnnotation(), // no
          fixtures.newAnnotation(), // yes
          fixtures.newAnnotation(), // yes
          fixtures.newReply(), // yes
        ],
        expectedLength: 3,
      },
      {
        annotations: [fixtures.oldAnnotation(), fixtures.newHighlight()],
        expectedLength: 0,
      },
      {
        annotations: [
          fixtures.newHighlight(), // no
          fixtures.newReply(), // yes
          fixtures.oldAnnotation(), // no
          fixtures.newPageNote(), // yes
        ],
        expectedLength: 2,
      },
    ].forEach(testCase => {
      it('returns number of unsaved, new annotations', () => {
        const state = { annotations: { annotations: testCase.annotations } };
        assert.lengthOf(
          selectors.newAnnotations(state),
          testCase.expectedLength
        );
      });
    });
  });

  describe('newHighlights', () => {
    [
      {
        annotations: [fixtures.oldAnnotation(), fixtures.newAnnotation()],
        expectedLength: 0,
      },
      {
        annotations: [
          fixtures.oldAnnotation(),
          Object.assign(fixtures.newHighlight(), { $tag: 'atag' }),
          Object.assign(fixtures.newHighlight(), { $tag: 'anothertag' }),
        ],
        expectedLength: 2,
      },
      {
        annotations: [
          fixtures.oldHighlight(),
          Object.assign(fixtures.newHighlight(), { $tag: 'atag' }),
          Object.assign(fixtures.newHighlight(), { $tag: 'anothertag' }),
        ],
        expectedLength: 2,
      },
    ].forEach(testCase => {
      it('returns number of unsaved, new highlights', () => {
        const state = { annotations: { annotations: testCase.annotations } };
        assert.lengthOf(
          selectors.newHighlights(state),
          testCase.expectedLength
        );
      });
    });
  });

  describe('noteCount', () => {
    it('returns number of page notes', () => {
      const state = {
        annotations: {
          annotations: [
            fixtures.oldPageNote(),
            fixtures.oldAnnotation(),
            fixtures.defaultAnnotation(),
          ],
        },
      };
      assert.deepEqual(selectors.noteCount(state), 1);
    });
  });

  describe('annotationCount', () => {
    it('returns number of annotations', () => {
      const state = {
        annotations: {
          annotations: [
            fixtures.oldPageNote(),
            fixtures.oldAnnotation(),
            fixtures.defaultAnnotation(),
          ],
        },
      };
      assert.deepEqual(selectors.annotationCount(state), 2);
    });
  });

  describe('orphanCount', () => {
    it('returns number of orphaned annotations', () => {
      const orphan = Object.assign(fixtures.oldAnnotation(), { $orphan: true });
      const state = {
        annotations: {
          annotations: [
            orphan,
            fixtures.oldAnnotation(),
            fixtures.defaultAnnotation(),
          ],
        },
      };
      assert.deepEqual(selectors.orphanCount(state), 1);
    });
  });

  describe('#savedAnnotations', function() {
    const savedAnnotations = selectors.savedAnnotations;

    it('returns annotations which are saved', function() {
      const state = {
        annotations: {
          annotations: [fixtures.newAnnotation(), fixtures.defaultAnnotation()],
        },
      };
      assert.deepEqual(savedAnnotations(state), [fixtures.defaultAnnotation()]);
    });
  });

  describe('#findIDsForTags', function() {
    const findIDsForTags = selectors.findIDsForTags;

    it('returns the IDs corresponding to the provided local tags', function() {
      const ann = fixtures.defaultAnnotation();
      const state = {
        annotations: {
          annotations: [Object.assign(ann, { $tag: 't1' })],
        },
      };
      assert.deepEqual(findIDsForTags(state, ['t1']), [ann.id]);
    });

    it('does not return IDs for annotations that do not have an ID', function() {
      const ann = fixtures.newAnnotation();
      const state = {
        annotations: {
          annotations: [Object.assign(ann, { $tag: 't1' })],
        },
      };
      assert.deepEqual(findIDsForTags(state, ['t1']), []);
    });
  });

  describe('#hideAnnotation', function() {
    it('sets the `hidden` state to `true`', function() {
      const store = createTestStore();
      const ann = fixtures.moderatedAnnotation({ hidden: false });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.hideAnnotation(ann.id));

      const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, true);
    });
  });

  describe('#unhideAnnotation', function() {
    it('sets the `hidden` state to `false`', function() {
      const store = createTestStore();
      const ann = fixtures.moderatedAnnotation({ hidden: true });

      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.unhideAnnotation(ann.id));

      const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
      assert.equal(storeAnn.hidden, false);
    });
  });

  describe('#removeAnnotations', function() {
    it('removes the annotation', function() {
      const store = createTestStore();
      const ann = fixtures.defaultAnnotation();
      store.dispatch(actions.addAnnotations([ann]));
      store.dispatch(actions.removeAnnotations([ann]));
      assert.equal(store.getState().annotations.annotations.length, 0);
    });
  });

  describe('#updateFlagStatus', function() {
    [
      {
        description: 'non-moderator flags annotation',
        wasFlagged: false,
        nowFlagged: true,
        oldModeration: undefined,
        newModeration: undefined,
      },
      {
        description: 'non-moderator un-flags an annotation',
        wasFlagged: true,
        nowFlagged: false,
        oldModeration: undefined,
        newModeration: undefined,
      },
      {
        description: 'moderator un-flags an already un-flagged annotation',
        wasFlagged: false,
        nowFlagged: false,
        oldModeration: { flagCount: 1 },
        newModeration: { flagCount: 1 },
      },
      {
        description: 'moderator flags an already flagged annotation',
        wasFlagged: true,
        nowFlagged: true,
        oldModeration: { flagCount: 1 },
        newModeration: { flagCount: 1 },
      },
      {
        description: 'moderator flags an annotation',
        wasFlagged: false,
        nowFlagged: true,
        oldModeration: { flagCount: 0 },
        newModeration: { flagCount: 1 },
      },
      {
        description: 'moderator un-flags an annotation',
        wasFlagged: true,
        nowFlagged: false,
        oldModeration: { flagCount: 1 },
        newModeration: { flagCount: 0 },
      },
    ].forEach(testCase => {
      it(`updates the flagged status of an annotation when a ${testCase.description}`, () => {
        const store = createTestStore();
        const ann = fixtures.defaultAnnotation();
        ann.flagged = testCase.wasFlagged;
        ann.moderation = testCase.oldModeration;

        store.dispatch(actions.addAnnotations([ann]));
        store.dispatch(actions.updateFlagStatus(ann.id, testCase.nowFlagged));

        const storeAnn = selectors.findAnnotationByID(store.getState(), ann.id);
        assert.equal(storeAnn.flagged, testCase.nowFlagged);
        assert.deepEqual(storeAnn.moderation, testCase.newModeration);
      });
    });
  });
});
