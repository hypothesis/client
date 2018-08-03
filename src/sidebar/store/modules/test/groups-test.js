'use strict';

const createStore = require('../../create-store');
const annotations = require('../annotations');
const selection = require('../selection');
const session = require('../session');
const groups = require('../groups');

describe('sidebar.store.modules.groups', () => {
  const publicGroup = {
    id: '__world__',
    name: 'Public',
  };

  const privateGroup = {
    id: 'foo',
    name: 'Private',
  };

  const openGroupForCurrentWebsite = {
    id: 'opengroup',
    name: 'BioPub Public Comments',
  };

  let store;

  beforeEach(() => {
    store = createStore([groups]);
  });

  describe('focusGroup', () => {
    beforeEach(() => {
      sinon.stub(console, 'error');
    });

    afterEach(() => {
      console.error.restore();
    });

    it('updates the focused group if valid', () => {
      store.loadGroups([publicGroup]);

      store.focusGroup(publicGroup.id);

      assert.equal(store.getState().focusedGroupId, publicGroup.id);
      assert.notCalled(console.error);
    });

    it('does not update focused group if not valid', () => {
      store.loadGroups([publicGroup]);

      store.focusGroup(privateGroup.id);

      assert.equal(store.getState().focusedGroupId, publicGroup.id);
      assert.called(console.error);
    });
  });

  describe('loadGroups', () => {
    it('updates the set of groups', () => {
      store.loadGroups([publicGroup]);
      assert.deepEqual(store.getState().groups, [publicGroup]);
    });

    it('resets the focused group if not in new set of groups', () => {
      store.loadGroups([publicGroup]);
      store.focusGroup(publicGroup.id);
      store.loadGroups([]);

      assert.equal(store.getState().focusedGroupId, null);
    });

    it('leaves focused group unchanged if in new set of groups', () => {
      store.loadGroups([publicGroup]);
      store.focusGroup(publicGroup.id);
      store.loadGroups([publicGroup, privateGroup]);

      assert.equal(store.getState().focusedGroupId, publicGroup.id);
    });
  });

  describe('allGroups', () => {
    const directLinkedPublicAnn = {
      id: 'direct-linked-id',
      group: '__world__',
    };

    const directLinkedOpenGroupAnn = {
      id: 'direct-linked-id',
      group: openGroupForCurrentWebsite.id,
    };

    const makeStore = (directLinkedId=null) => createStore(
      [annotations, groups, selection, session],
      [{ annotations: directLinkedId }]
    );

    const loggedInUser = {
      userid: 'acct:johnsmith@hypothes.is',
      features: {},
      preferences: {},
    };

    beforeEach(() => {
      store = makeStore();
    });

    it('returns all groups for logged-in users', () => {
      store.loadGroups([publicGroup, privateGroup]);
      store.updateSession(loggedInUser);
      assert.deepEqual(store.allGroups(), [publicGroup, privateGroup]);
    });

    it('includes "Public" group for logged-out users if page has no associated groups', () => {
      store.loadGroups([publicGroup]);
      assert.deepEqual(store.allGroups(), [publicGroup]);
    });

    it('excludes "Public" group for logged-out users if page has associated groups', () => {
      store.loadGroups([publicGroup, openGroupForCurrentWebsite]);
      assert.deepEqual(store.allGroups(), [openGroupForCurrentWebsite]);
    });

    it('includes "Public" group for logged-out users if direct linked to "Public" annotation', () => {
      store = makeStore(directLinkedPublicAnn.id);
      store.loadGroups([openGroupForCurrentWebsite, publicGroup]);
      store.addAnnotations([directLinkedPublicAnn]);
      assert.deepEqual(store.allGroups(), [openGroupForCurrentWebsite, publicGroup]);
    });

    it('excludes "Public" group for logged-out users if ' +
       ' direct linked to non-"Public" annotation', () => {
      store = makeStore(directLinkedOpenGroupAnn);
      store.loadGroups([openGroupForCurrentWebsite, publicGroup]);
      store.addAnnotations([directLinkedOpenGroupAnn]);
      assert.deepEqual(store.allGroups(), [openGroupForCurrentWebsite]);
    });
  });

  describe('getGroup', () => {
    it('returns the group with the given ID', () => {
      store.loadGroups([publicGroup, privateGroup]);
      assert.deepEqual(store.getGroup(privateGroup.id), privateGroup);
    });
  });

  describe('focusedGroup', () => {
    it('returns `null` if no group is focused', () => {
      assert.equal(store.focusedGroup(), null);
    });

    it('returns the focused group if a group has been focused', () => {
      store.loadGroups([privateGroup]);
      store.focusGroup(privateGroup.id);
      assert.deepEqual(store.focusedGroup(), privateGroup);
    });
  });

  describe('focusedGroupId', () => {
    it('returns `null` if no group is focused', () => {
      assert.equal(store.focusedGroupId(), null);
    });

    it('returns the focused group ID if a group has been focused', () => {
      store.loadGroups([privateGroup]);
      store.focusGroup(privateGroup.id);
      assert.equal(store.focusedGroupId(), privateGroup.id);
    });
  });
});
