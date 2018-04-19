'use strict';

const createStore = require('../../create-store');
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

  let store;

  beforeEach(() => {
    store = createStore([groups]);
  });

  describe('focusGroup', () => {
    it('updates the focused group if valid', () => {
      store.loadGroups([publicGroup]);
      store.focusGroup(publicGroup.id);
      assert.equal(store.getState().focusedGroupId, publicGroup.id);
    });

    it('does not set the focused group if invalid', () => {
      store.loadGroups([publicGroup]);
      store.focusGroup(privateGroup.id);
      assert.equal(store.getState().focusedGroupId, null);
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
    it('returns all groups', () => {
      store.loadGroups([publicGroup, privateGroup]);
      assert.deepEqual(store.allGroups(), [publicGroup, privateGroup]);
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
});
