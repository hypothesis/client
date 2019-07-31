'use strict';

const createStore = require('../../create-store');

const annotations = require('../annotations');
const groups = require('../groups');
const realTimeUpdates = require('../real-time-updates');

const { removeAnnotations } = annotations.actions;
const { focusGroup } = groups.actions;

describe('sidebar/store/modules/real-time-updates', () => {
  let fakeAnnotationExists;
  let fakeFocusedGroupId;
  let fakeIsSidebar;
  let store;

  beforeEach(() => {
    fakeAnnotationExists = sinon.stub().returns(true);
    fakeFocusedGroupId = sinon.stub().returns('group-1');
    fakeIsSidebar = sinon.stub().returns(true);

    store = createStore([realTimeUpdates]);

    realTimeUpdates.$imports.$mock({
      './annotations': {
        selectors: { annotationExists: fakeAnnotationExists },
      },
      './groups': {
        selectors: { focusedGroupId: fakeFocusedGroupId },
      },
      './viewer': {
        selectors: { isSidebar: fakeIsSidebar },
      },
    });
  });

  afterEach(() => {
    realTimeUpdates.$imports.$restore();
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
      fakeIsSidebar.returns(false);

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
        updates.length + deletes.length
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
});
