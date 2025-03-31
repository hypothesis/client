import sinon from 'sinon';

import { createStore } from '../../create-store';
import { annotationsModule } from '../annotations';
import { groupsModule } from '../groups';
import { realTimeUpdatesModule, $imports } from '../real-time-updates';
import { selectionModule } from '../selection';

const { removeAnnotations } = annotationsModule.actionCreators;
const { focusGroup } = groupsModule.actionCreators;

describe('sidebar/store/modules/real-time-updates', () => {
  let fakeAnnotationExists;
  let fakeFocusedGroupId;
  let fakeRoute;
  let fakeProfile;
  let fakeAllAnnotations;
  const fakeSettings = {};
  let store;

  beforeEach(() => {
    fakeAnnotationExists = sinon.stub().callsFake(state => {
      assert.equal(state, store.getState().annotations);
      return true;
    });

    fakeFocusedGroupId = sinon.stub().callsFake(state => {
      assert.equal(state, store.getState().groups);
      return 'group-1';
    });

    fakeRoute = sinon.stub().callsFake(state => {
      assert.equal(state, store.getState().route);
      return 'sidebar';
    });

    fakeProfile = sinon.stub().returns({ userid: 'current_user_id' });
    fakeAllAnnotations = sinon.stub().returns([]);

    store = createStore(
      [realTimeUpdatesModule, annotationsModule, selectionModule],
      [fakeSettings],
    );

    $imports.$mock({
      './annotations': {
        annotationsModule: {
          selectors: {
            annotationExists: fakeAnnotationExists,
            allAnnotations: fakeAllAnnotations,
          },
        },
      },
      './groups': {
        groupsModule: {
          selectors: { focusedGroupId: fakeFocusedGroupId },
        },
      },
      './route': {
        routeModule: {
          selectors: { route: fakeRoute },
        },
      },
      './session': {
        sessionModule: {
          selectors: { profile: fakeProfile },
        },
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function addPendingUpdates(store) {
    const updates = [
      { id: 'updated-ann', group: 'group-1' },
      { id: 'created-ann', group: 'group-1' },
    ];
    store.receiveRealTimeUpdates({
      updatedAnnotations: updates,
    });
    return updates;
  }

  function addPendingDeletions(store) {
    const deletions = [{ id: 'deleted-ann' }];
    store.receiveRealTimeUpdates({
      deletedAnnotations: deletions,
    });
    return deletions;
  }

  describe('receiveRealTimeUpdates', () => {
    it("adds pending updates where the focused group matches the annotation's group", () => {
      addPendingUpdates(store);
      assert.deepEqual(store.pendingUpdates(), {
        'updated-ann': { id: 'updated-ann', group: 'group-1' },
        'created-ann': { id: 'created-ann', group: 'group-1' },
      });
    });

    it("does not add pending updates if the focused group does not match the annotation's group", () => {
      fakeFocusedGroupId.returns('other-group');
      addPendingUpdates(store);
      assert.deepEqual(store.pendingUpdates(), {});
    });

    it('always adds pending updates in the stream where there is no focused group', () => {
      fakeFocusedGroupId.returns(null);
      fakeRoute.returns('stream');

      addPendingUpdates(store);

      assert.deepEqual(store.pendingUpdates(), {
        'updated-ann': { id: 'updated-ann', group: 'group-1' },
        'created-ann': { id: 'created-ann', group: 'group-1' },
      });
    });

    it('adds pending deletions if the annotation exists locally', () => {
      fakeAnnotationExists.returns(true);
      addPendingDeletions(store);
      assert.deepEqual(store.pendingDeletions(), {
        'deleted-ann': true,
      });
    });

    it('does not add pending deletions if the annotation does not exist locally', () => {
      fakeAnnotationExists.returns(false);
      addPendingDeletions(store);
      assert.deepEqual(store.pendingDeletions(), {});
    });
  });

  describe('clearPendingUpdates', () => {
    it('clears pending updates', () => {
      addPendingUpdates(store);
      store.clearPendingUpdates();
      assert.deepEqual(store.pendingUpdates(), {});
    });

    it('clears pending deletions', () => {
      addPendingDeletions(store);
      store.clearPendingUpdates();
      assert.deepEqual(store.pendingDeletions(), {});
    });
  });

  describe('pendingUpdateCount', () => {
    it('returns the total number of pending updates', () => {
      const updates = addPendingUpdates(store);
      const deletes = addPendingDeletions(store);
      assert.deepEqual(
        store.pendingUpdateCount(),
        updates.length + deletes.length,
      );
    });
  });

  it('clears pending updates when annotations are added/updated', () => {
    const updates = addPendingUpdates(store);

    // Dispatch `ADD_ANNOTATIONS` directly here rather than using
    // the `addAnnotations` action creator because that has side effects.
    store.dispatch({ type: 'ADD_ANNOTATIONS', annotations: updates });

    assert.deepEqual(store.pendingUpdateCount(), 0);
  });

  it('clears pending updates when annotations are removed', () => {
    const updates = addPendingUpdates(store);
    const deletions = addPendingDeletions(store);

    store.dispatch(removeAnnotations([...updates, ...deletions]));

    assert.equal(store.pendingUpdateCount(), 0);
  });

  it('clears pending updates when focused group changes', () => {
    addPendingUpdates(store);
    addPendingDeletions(store);

    store.dispatch(focusGroup('123'));

    assert.deepEqual(store.pendingUpdateCount(), 0);
  });

  describe('hasPendingDeletion', () => {
    it('returns false if there are no pending deletions', () => {
      assert.equal(store.hasPendingDeletion('deleted-ann'), false);
    });

    it('returns true if there are pending deletions', () => {
      addPendingDeletions(store);
      assert.equal(store.hasPendingDeletion('deleted-ann'), true);
    });
  });

  describe('hasPendingUpdates', () => {
    it('returns false if there are no pending updates', () => {
      assert.equal(store.hasPendingUpdates(), false);
    });

    it('returns true if there are pending updates', () => {
      addPendingUpdates(store);
      assert.equal(store.hasPendingUpdates(), true);
    });
  });

  describe('hasPendingUpdatesOrDeletions', () => {
    it('returns false if there are no pending updates nor deletions', () => {
      assert.isFalse(store.hasPendingUpdatesOrDeletions());
    });

    it('returns true if there are pending updates', () => {
      addPendingUpdates(store);
      assert.isTrue(store.hasPendingUpdatesOrDeletions());
    });

    it('returns true if there are pending deletions', () => {
      addPendingDeletions(store);
      assert.isTrue(store.hasPendingUpdatesOrDeletions());
    });
  });

  describe('pendingMentionCount', () => {
    [
      // New annotations with no mentions or mentions of other users are ignored
      {
        updatedAnnotations: [
          {
            id: 'new_anno_1',
            group: 'group-1',
            mentions: [],
          },
          {
            id: 'new_anno_2',
            group: 'group-1',
            mentions: [{ userid: 'someone_else' }],
          },
        ],
        expectedMentionCount: 0,
      },

      // New annotations with mentions of current user are always counted.
      // Existing annotations which didn't have a mention of current user but
      // now do, are also counted.
      {
        updatedAnnotations: [
          {
            id: 'new_anno_3',
            group: 'group-1',
            mentions: [{ userid: 'current_user_id' }],
          },
          {
            id: 'existing_anno_1',
            group: 'group-1',
            mentions: [{ userid: 'current_user_id' }],
          },
        ],
        expectedMentionCount: 2,
      },

      // Existing annotations which already had a mention to current user are
      // not counted again.
      {
        updatedAnnotations: [
          {
            id: 'existing_anno_2',
            group: 'group-1',
            mentions: [{ userid: 'current_user_id' }],
          },
        ],
        expectedMentionCount: 0,
      },

      // Existing annotation which now mentions another user are ignored
      {
        updatedAnnotations: [
          {
            id: 'existing_anno_3',
            group: 'group-1',
            mentions: [{ userid: 'someone_else_two' }],
          },
        ],
        expectedMentionCount: 0,
      },
    ].forEach(({ updatedAnnotations, expectedMentionCount }) => {
      it('counts new annos with mentions and existing annos with added mentions', () => {
        fakeAllAnnotations.returns([
          {
            // This annotation does not yet have a mention of current user
            id: 'existing_anno_1',
            mentions: [],
          },
          {
            // This annotation already has a mention of current user
            id: 'existing_anno_2',
            mentions: [{ userid: 'current_user_id' }],
          },
          {
            // This annotation has a mention of other user
            id: 'existing_anno_3',
            mentions: [{ userid: 'someone_else' }],
          },
        ]);

        store.receiveRealTimeUpdates({ updatedAnnotations });

        assert.equal(store.pendingMentionCount(), expectedMentionCount);
      });
    });
  });
});
