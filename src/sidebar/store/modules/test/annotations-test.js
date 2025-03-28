import * as metadata from '../../../helpers/annotation-metadata';
import * as fixtures from '../../../test/annotation-fixtures';
import { createStore } from '../../create-store';
import { annotationsModule } from '../annotations';
import { routeModule } from '../route';
import { sessionModule } from '../session';

function createTestStore() {
  return createStore([annotationsModule, routeModule, sessionModule], [{}]);
}

// Tests for some of the functionality in this store module are currently in
// still in `sidebar/store/test/index-test.js`. These tests should be migrated
// here in future.

describe('sidebar/store/modules/annotations', () => {
  describe('#addAnnotations()', () => {
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

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      store = createTestStore();
      store.changeRoute('sidebar', {});
    });

    afterEach(() => {
      clock.restore();
    });

    it('adds annotations not in the store', () => {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      assert.match(store.getState().annotations.annotations, [
        sinon.match(annot),
      ]);
    });

    it('assigns a $tag to annotations', () => {
      const annotA = Object.assign(fixtures.defaultAnnotation(), { id: 'a1' });
      const annotB = Object.assign(fixtures.defaultAnnotation(), { id: 'a2' });

      store.addAnnotations([annotA, annotB]);

      const tags = store.getState().annotations.annotations.map(a => {
        return a.$tag;
      });

      assert.deepEqual(tags, ['t1', 't2']);
    });

    it('assigns a $cluster to annotations', () => {
      const getClusters = () =>
        store.getState().annotations.annotations.map(a => a.$cluster);

      const userHighlight = Object.assign(fixtures.defaultAnnotation(), {
        id: 'a1',
        user: 'acct:jondoe@hypothes.is',
      });

      const userAnnotation = Object.assign(fixtures.defaultAnnotation(), {
        id: 'a2',
        user: 'acct:jondoe@hypothes.is',
        text: 'content', // This will ensure this is treated as an annotation instead of a highlight
      });

      const otherContent = Object.assign(fixtures.defaultAnnotation(), {
        id: 'a3',
        user: 'acct:someone-else@hypothes.is',
        text: 'content',
      });

      store.updateProfile({ userid: 'acct:jondoe@hypothes.is' });
      store.addAnnotations([userHighlight, userAnnotation, otherContent]);
      assert.deepEqual(getClusters(), [
        'user-highlights',
        'user-annotations',
        'other-content',
      ]);

      store.clearAnnotations();

      store.updateProfile({ userid: null });
      store.addAnnotations([userHighlight, userAnnotation, otherContent]);
      assert.deepEqual(getClusters(), [
        'other-content',
        'other-content',
        'other-content',
      ]);
    });

    it('updates annotations with matching IDs in the store', () => {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      const update = Object.assign({}, fixtures.defaultAnnotation(), {
        text: 'update',
      });
      store.addAnnotations([update]);

      const updatedAnnot = store.getState().annotations.annotations[0];
      assert.equal(updatedAnnot.text, 'update');
    });

    it('updates annotations with matching $tags in the store', () => {
      const annot = fixtures.newAnnotation();
      annot.$tag = 'local-tag';
      store.addAnnotations([annot]);

      const saved = Object.assign({}, annot, { id: 'server-id' });
      store.addAnnotations([saved]);

      const annots = store.getState().annotations.annotations;
      assert.equal(annots.length, 1);
      assert.equal(annots[0].id, 'server-id');
    });

    it('preserves anchoring status of updated annotations', () => {
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

    it('sets the timeout flag on annotations that fail to anchor within a time limit', () => {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isTrue(store.getState().annotations.annotations[0].$anchorTimeout);
    });

    it('does not set the timeout flag on annotations that do anchor within a time limit', () => {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'anchored' });

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isFalse(
        store.getState().annotations.annotations[0].$anchorTimeout,
      );
    });

    it('does not attempt to modify orphan status if annotations are removed before anchoring timeout expires', () => {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      store.updateAnchorStatus({ [tagForID(annot.id)]: 'anchored' });
      store.removeAnnotations([annot]);

      assert.doesNotThrow(() => {
        clock.tick(ANCHOR_TIME_LIMIT);
      });
    });

    it('does not expect annotations to anchor on the stream', () => {
      const isOrphan = function () {
        return !!metadata.isOrphan(store.getState().annotations.annotations[0]);
      };

      const annot = fixtures.defaultAnnotation();
      store.changeRoute('stream', { q: 'a-query' });
      store.addAnnotations([annot]);

      clock.tick(ANCHOR_TIME_LIMIT);

      assert.isFalse(isOrphan());
    });

    it('initializes the $orphan field for new annotations', () => {
      store.addAnnotations([fixtures.newAnnotation()]);
      assert.isFalse(store.getState().annotations.annotations[0].$orphan);
    });

    describe('clearAnnotations', () => {
      it('should clear annotations and annotation state from the store', () => {
        const annot = fixtures.defaultAnnotation();
        store.addAnnotations([annot]);
        store.hoverAnnotations([annot.id]);
        store.highlightAnnotations([annot.id]);

        store.clearAnnotations();

        assert.isEmpty(store.getState().annotations.annotations);
        assert.isEmpty(store.hoveredAnnotations());
        assert.isEmpty(store.highlightedAnnotations());
      });
    });

    describe('hoverAnnotations', () => {
      it('adds the provided annotation IDs to the focused annotations', () => {
        store.hoverAnnotations(['1', '2', '3']);
        assert.deepEqual(store.hoveredAnnotations(), ['1', '2', '3']);
      });

      it('replaces any other focused annotation IDs', () => {
        store.hoverAnnotations(['1']);
        store.hoverAnnotations(['2', '3']);
        assert.deepEqual(store.hoveredAnnotations(), ['2', '3']);
      });

      it('sets focused annotations to an empty object if no IDs provided', () => {
        store.hoverAnnotations(['1']);
        store.hoverAnnotations([]);
        assert.isEmpty(store.hoveredAnnotations());
      });
    });

    describe('highlightAnnotations', () => {
      it('updates the highlighted state with the passed annotations', () => {
        store.highlightAnnotations(['id1', 'id2', 'id3']);
        assert.sameMembers(store.highlightedAnnotations(), [
          'id1',
          'id2',
          'id3',
        ]);
      });

      it('replaces any existing highlighted annotations', () => {
        store.highlightAnnotations(['id1', 'id2', 'id3']);
        store.highlightAnnotations(['id3', 'id4']);
        assert.sameMembers(store.highlightedAnnotations(), ['id3', 'id4']);
      });
    });

    describe('isAnnotationHovered', () => {
      it('returns true if the provided annotation ID is in the set of hovered annotations', () => {
        store.hoverAnnotations([1, 2]);
        assert.isTrue(store.isAnnotationHovered(2));
      });

      it('returns false if the provided annotation ID is not in the set of hovered annotations', () => {
        assert.isFalse(store.isAnnotationHovered(2));
      });
    });
  });

  describe('#isWaitingToAnchorAnnotations', () => {
    it('returns true if there are unanchored annotations', () => {
      const unanchored = Object.assign(fixtures.oldAnnotation(), {
        $orphan: undefined,
      });
      const store = createTestStore();
      store.addAnnotations([unanchored]);
      assert.isTrue(store.isWaitingToAnchorAnnotations());
    });

    it('returns false if all annotations are anchored', () => {
      const store = createTestStore();
      store.addAnnotations([
        Object.assign(fixtures.oldPageNote(), { $orphan: false }),
        Object.assign(fixtures.defaultAnnotation(), { $orphan: false }),
      ]);
      assert.isFalse(store.isWaitingToAnchorAnnotations());
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
        const store = createTestStore();
        store.addAnnotations(testCase.annotations);
        assert.lengthOf(store.newAnnotations(), testCase.expectedLength);
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
        const store = createTestStore();
        store.addAnnotations(testCase.annotations);
        assert.lengthOf(store.newHighlights(), testCase.expectedLength);
      });
    });
  });

  describe('noteCount', () => {
    it('returns number of page notes', () => {
      const store = createTestStore();
      store.addAnnotations([
        fixtures.oldPageNote(),
        fixtures.oldAnnotation(),
        fixtures.defaultAnnotation(),
      ]);
      assert.deepEqual(store.noteCount(), 1);
    });
  });

  describe('annotationCount', () => {
    it('returns number of annotations', () => {
      const store = createTestStore();
      store.addAnnotations([
        fixtures.oldPageNote(),
        fixtures.oldAnnotation(),
        fixtures.defaultAnnotation(),
      ]);
      assert.deepEqual(store.annotationCount(), 2);
    });
  });

  describe('allAnnotations', () => {
    it('returns all the annotations in the store', () => {
      const store = createTestStore();
      const annotation1 = fixtures.oldPageNote();
      const annotation2 = fixtures.defaultAnnotation();
      store.addAnnotations([annotation1, annotation2]);
      assert.deepEqual(store.allAnnotations(), [
        store.findAnnotationByID(annotation1.id),
        store.findAnnotationByID(annotation2.id),
      ]);
    });
  });

  describe('orphanCount', () => {
    it('returns number of orphaned annotations', () => {
      const orphan = Object.assign(fixtures.oldAnnotation(), { $orphan: true });
      const store = createTestStore();
      store.addAnnotations([
        orphan,
        fixtures.oldAnnotation(),
        fixtures.defaultAnnotation(),
      ]);
      assert.deepEqual(store.orphanCount(), 1);
    });
  });

  describe('#savedAnnotations', () => {
    it('returns annotations which are saved', () => {
      const store = createTestStore();
      store.addAnnotations([
        fixtures.newAnnotation(),
        fixtures.defaultAnnotation(),
      ]);

      // `assert.match` is used here to ignore internal properties added by
      // `store.addAnnotations`.
      assert.match(store.savedAnnotations(), [
        sinon.match(fixtures.defaultAnnotation()),
      ]);
    });
  });

  describe('#findIDsForTags', () => {
    it('returns the IDs corresponding to the provided local tags', () => {
      const store = createTestStore();
      const ann = fixtures.defaultAnnotation();
      store.addAnnotations([Object.assign(ann, { $tag: 't1' })]);
      assert.deepEqual(store.findIDsForTags(['t1']), [ann.id]);
    });

    it('does not return IDs for annotations that do not have an ID', () => {
      const store = createTestStore();
      const ann = fixtures.newAnnotation();
      store.addAnnotations([Object.assign(ann, { $tag: 't1' })]);
      assert.deepEqual(store.findIDsForTags(['t1']), []);
    });
  });

  describe('#hideAnnotation', () => {
    it('sets the `hidden` state to `true`', () => {
      const store = createTestStore();
      const ann = fixtures.moderatedAnnotation({ hidden: false });

      store.addAnnotations([ann]);
      store.hideAnnotation(ann.id);

      const storeAnn = store.findAnnotationByID(ann.id);
      assert.equal(storeAnn.hidden, true);
    });
  });

  describe('#unhideAnnotation', () => {
    it('sets the `hidden` state to `false`', () => {
      const store = createTestStore();
      const ann = fixtures.moderatedAnnotation({ hidden: true });

      store.addAnnotations([ann]);
      store.unhideAnnotation(ann.id);

      const storeAnn = store.findAnnotationByID(ann.id);
      assert.equal(storeAnn.hidden, false);
    });
  });

  describe('#removeAnnotations', () => {
    it('removes the annotation', () => {
      const store = createTestStore();
      const ann = fixtures.defaultAnnotation();
      store.addAnnotations([ann]);
      store.removeAnnotations([ann]);
      assert.equal(store.getState().annotations.annotations.length, 0);
    });
  });

  describe('#updateFlagStatus', () => {
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

        store.addAnnotations([ann]);
        store.updateFlagStatus(ann.id, testCase.nowFlagged);

        const storeAnn = store.findAnnotationByID(ann.id);
        assert.equal(storeAnn.flagged, testCase.nowFlagged);
        assert.deepEqual(storeAnn.moderation, testCase.newModeration);
      });
    });
  });

  describe('#annotationExists', () => {
    it('returns false if annotation does not exist', () => {
      const store = createTestStore();
      assert.isFalse(store.annotationExists('foobar'));
    });

    it('returns true if annotation does exist', () => {
      const store = createTestStore();
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      assert.isTrue(store.annotationExists(annot.id));
    });
  });

  describe('isAnnotationHighlighted', () => {
    [
      { annotation: undefined, expectedResult: false },
      { annotation: {}, expectedResult: false },
      { annotation: { id: '1' }, expectedResult: true },
      { annotation: { id: '2' }, expectedResult: true },
      { annotation: { id: '3' }, expectedResult: false },
    ].forEach(({ annotation, expectedResult }) => {
      it('returns true if the annotation ID is in the set of highlighted annotations', () => {
        const store = createTestStore();
        store.highlightAnnotations(['1', '2']);
        assert.equal(store.isAnnotationHighlighted(annotation), expectedResult);
      });
    });
  });

  describe('usersWhoAnnotated', () => {
    it('returns expected list of unique and sorted users', () => {
      const store = createTestStore();

      // Add a few annotations assigned to duplicated unordered users
      store.addAnnotations([
        Object.assign(fixtures.defaultAnnotation(), {
          id: 'a1',
          user: 'acct:jondoe@hypothes.is',
        }),
        Object.assign(fixtures.defaultAnnotation(), {
          id: 'a2',
          user: 'acct:jondoe@hypothes.is',
        }),
        Object.assign(fixtures.defaultAnnotation(), {
          id: 'a3',
          user: 'acct:janedoe@hypothes.is',
          user_info: {
            display_name: 'Jane Doe',
          },
        }),
        Object.assign(fixtures.defaultAnnotation(), {
          id: 'a3',
          user: 'acct:janedoe@hypothes.is',
          user_info: {
            display_name: 'Jane Doe',
          },
        }),
      ]);

      // Only one instance of every user should be returned, and they should be
      // sorted by username
      assert.deepEqual(
        [
          {
            userid: 'acct:janedoe@hypothes.is',
            username: 'janedoe',
            displayName: 'Jane Doe',
          },
          {
            userid: 'acct:jondoe@hypothes.is',
            username: 'jondoe',
            displayName: null,
          },
        ],
        store.usersWhoAnnotated(),
      );
    });
  });

  describe('usersWhoWereMentioned', () => {
    it('returns expected list of unique users', () => {
      const store = createTestStore();

      // Add a few annotations with mentions
      store.addAnnotations([
        Object.assign(fixtures.defaultAnnotation(), {
          id: 'a1',
          mentions: [
            {
              userid: 'acct:jondoe@hypothes.is',
              username: 'jondoe',
              display_name: null,
            },
          ],
        }),
        Object.assign(fixtures.defaultAnnotation(), {
          id: 'a2',
          mentions: [
            {
              userid: 'acct:janedoe@hypothes.is',
              username: 'janedoe',
              display_name: 'Jane Doe',
            },
          ],
        }),
        Object.assign(fixtures.defaultAnnotation(), {
          id: 'a3',
          mentions: [
            {
              userid: 'acct:janedoe@hypothes.is',
              username: 'janedoe',
              display_name: 'Jane Doe',
            },
            {
              userid: 'acct:jondoe@hypothes.is',
              username: 'jondoe',
              display_name: null,
            },
          ],
        }),
      ]);

      // Only one instance of every mentioned user should be returned
      assert.deepEqual(
        [
          {
            userid: 'acct:jondoe@hypothes.is',
            username: 'jondoe',
            displayName: null,
          },
          {
            userid: 'acct:janedoe@hypothes.is',
            username: 'janedoe',
            displayName: 'Jane Doe',
          },
        ],
        store.usersWhoWereMentioned(),
      );
    });
  });
});
