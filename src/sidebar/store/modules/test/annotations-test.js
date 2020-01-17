import * as fixtures from '../../../test/annotation-fixtures';
import uiConstants from '../../../ui-constants';
import * as metadata from '../../../util/annotation-metadata';
import createStore from '../../create-store';
import annotations from '../annotations';
import { $imports } from '../annotations';
import defaults from '../defaults';
import drafts from '../drafts';
import groups from '../groups';
import selection from '../selection';
import session from '../session';
import viewer from '../viewer';

const { actions, selectors } = annotations;

function createTestStore() {
  return createStore(
    [annotations, selection, defaults, drafts, groups, session, viewer],
    [{}]
  );
}

// Tests for most of the functionality in reducers/annotations.js are currently
// in the tests for the whole Redux store

describe('sidebar/store/modules/annotations', function() {
  let fakeDefaultPermissions;

  beforeEach(() => {
    fakeDefaultPermissions = sinon.stub();
    $imports.$mock({
      '../../util/permissions': { defaultPermissions: fakeDefaultPermissions },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

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

    it('does not change `selectedTab` state if annotations are already loaded', function() {
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot]);
      const page = fixtures.oldPageNote();
      store.addAnnotations([page]);
      assert.equal(
        store.getState().selection.selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
    });

    it('sets `selectedTab` to "note" if only page notes are present', function() {
      const page = fixtures.oldPageNote();
      store.addAnnotations([page]);
      assert.equal(
        store.getState().selection.selectedTab,
        uiConstants.TAB_NOTES
      );
    });

    it('leaves `selectedTab` as "annotation" if annotations and/or page notes are present', function() {
      const page = fixtures.oldPageNote();
      const annot = fixtures.defaultAnnotation();
      store.addAnnotations([annot, page]);
      assert.equal(
        store.getState().selection.selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
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
      store.setAppIsSidebar(false);
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

  describe('#createAnnotation', function() {
    let clock;
    let now;
    let store;

    beforeEach(() => {
      // Stop the clock to keep the current date from advancing
      clock = sinon.useFakeTimers();
      now = new Date();
      store = createTestStore();
    });

    afterEach(() => {
      clock.restore();
    });

    it('should create an annotation', function() {
      const ann = fixtures.oldAnnotation();
      store.dispatch(actions.createAnnotation(ann));
      assert.equal(
        selectors.findAnnotationByID(store.getState(), ann.id).id,
        ann.id
      );
    });

    it('should set basic default properties on a new/empty annotation', () => {
      store.dispatch(actions.createAnnotation({ id: 'myID' }, now));

      const createdAnnotation = selectors.findAnnotationByID(
        store.getState(),
        'myID'
      );

      assert.include(createdAnnotation, {
        created: now.toISOString(),
        updated: now.toISOString(),
        text: '',
      });
      assert.isArray(createdAnnotation.tags);
    });

    it('should set user properties on a new/empty annotation', () => {
      store.dispatch(actions.createAnnotation({ id: 'myID' }, now));

      const createdAnnotation = selectors.findAnnotationByID(
        store.getState(),
        'myID'
      );

      assert.equal(createdAnnotation.user, store.getState().session.userid);
      assert.equal(
        createdAnnotation.user_info,
        store.getState().session.user_info
      );
    });

    it('should set default permissions on a new annotation', () => {
      fakeDefaultPermissions.returns('somePermissions');
      store.dispatch(actions.createAnnotation({ id: 'myID' }, now));

      const createdAnnotation = selectors.findAnnotationByID(
        store.getState(),
        'myID'
      );

      assert.equal(createdAnnotation.permissions, 'somePermissions');
    });

    it('should set group to currently-focused group if not set on annotation', () => {
      store.dispatch(actions.createAnnotation({ id: 'myID' }, now));

      const createdAnnotation = selectors.findAnnotationByID(
        store.getState(),
        'myID'
      );

      assert.equal(
        createdAnnotation.group,
        store.getState().groups.focusedGroupId
      );
    });

    it('should set not overwrite properties if present', () => {
      store.dispatch(
        actions.createAnnotation(
          {
            id: 'myID',
            created: 'when',
            updated: 'then',
            text: 'my annotation',
            tags: ['foo', 'bar'],
            group: 'fzzy',
            permissions: ['whatever'],
            user: 'acct:foo@bar.com',
            user_info: {
              display_name: 'Herbivore Fandango',
            },
          },
          now
        )
      );

      const createdAnnotation = selectors.findAnnotationByID(
        store.getState(),
        'myID'
      );

      assert.include(createdAnnotation, {
        created: 'when',
        updated: 'then',
        text: 'my annotation',
        group: 'fzzy',
        user: 'acct:foo@bar.com',
      });

      assert.include(createdAnnotation.tags, 'foo', 'bar');
      assert.include(createdAnnotation.permissions, 'whatever');
      assert.equal(
        createdAnnotation.user_info.display_name,
        'Herbivore Fandango'
      );
    });

    it('should change tab focus to TAB_ANNOTATIONS when a new annotation is created', function() {
      store.dispatch(actions.createAnnotation(fixtures.oldAnnotation()));
      assert.equal(
        store.getState().selection.selectedTab,
        uiConstants.TAB_ANNOTATIONS
      );
    });

    it('should change tab focus to TAB_NOTES when a new note annotation is created', function() {
      store.dispatch(actions.createAnnotation(fixtures.oldPageNote()));
      assert.equal(
        store.getState().selection.selectedTab,
        uiConstants.TAB_NOTES
      );
    });

    it('should expand parent of created annotation', function() {
      const store = createTestStore();
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
      assert.isTrue(store.getState().selection.expanded.annotation_id);
    });
  });
});
