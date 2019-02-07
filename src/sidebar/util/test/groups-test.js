'use strict';

const { combineGroups } = require('../groups');

describe('sidebar.util.groups', () => {
  describe('combineGroups', () => {
    it('labels groups in both lists as isMember true', () => {
      const userGroups = [{ id: 'groupa', name: 'GroupA' }];
      const featuredGroups = [{ id: 'groupa', name: 'GroupA' }];
      const groups = combineGroups(userGroups, featuredGroups);
      const groupA = groups.find(g => g.id === 'groupa');
      assert.equal(groupA.isMember, true);
    });

    it('combines groups from both lists uniquely', () => {
      const userGroups = [
        { id: 'groupa', name: 'GroupA' },
        { id: 'groupb', name: 'GroupB' },
      ];
      const featuredGroups = [
        { id: 'groupa', name: 'GroupA' },
        { id: '__world__', name: 'Public' },
      ];
      const groups = combineGroups(userGroups, featuredGroups);
      const ids = groups.map(g => g.id);
      assert.deepEqual(ids, ['__world__', 'groupa', 'groupb']);
    });

    it('adds isMember attribute to each group', () => {
      const userGroups = [{ id: 'groupa', name: 'GroupA' }];
      const featuredGroups = [
        { id: 'groupb', name: 'GroupB' },
        { id: '__world__', name: 'Public' },
      ];

      const expectedMembership = {
        __world__: true,
        groupa: true,
        groupb: false,
      };

      const groups = combineGroups(userGroups, featuredGroups);
      groups.forEach(g => assert.equal(g.isMember, expectedMembership[g.id]));
    });

    it('maintains the original ordering', () => {
      const userGroups = [
        { id: 'one', name: 'GroupA' },
        { id: 'two', name: 'GroupB' },
      ];
      const featuredGroups = [
        { id: 'one', name: 'GroupA' },
        { id: 'three', name: 'GroupC' },
      ];

      const groups = combineGroups(userGroups, featuredGroups);
      const ids = groups.map(g => g.id);
      assert.deepEqual(ids, ['one', 'two', 'three']);
    });

    it('lists the Public group first', () => {
      const userGroups = [{ id: 'one', name: 'GroupA' }];
      const featuredGroups = [{ id: '__world__', name: 'Public' }];

      const groups = combineGroups(userGroups, featuredGroups);
      assert.equal(groups[0].id, '__world__');
    });

    it('handles case where there is no Public group', () => {
      const userGroups = [];
      const featuredGroups = [];

      const groups = combineGroups(userGroups, featuredGroups);
      assert.deepEqual(groups, []);
    });
  });
});
