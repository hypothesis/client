'use strict';

const { combineGroups } = require('../groups');

describe('sidebar.util.groups', () => {
  describe('combineGroups', () => {
    it('labels groups in both lists as isMember true', () => {
      const userGroups = [{ id: 'groupa', name: 'GroupA' }];
      const featuredGroups = [{ id: 'groupa', name: 'GroupA' }];
      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar'
      );
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
      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar'
      );
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

      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar'
      );
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

      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar'
      );
      const ids = groups.map(g => g.id);
      assert.deepEqual(ids, ['one', 'two', 'three']);
    });

    it('lists the Public group first', () => {
      const userGroups = [{ id: 'one', name: 'GroupA' }];
      const featuredGroups = [{ id: '__world__', name: 'Public' }];

      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar'
      );
      assert.equal(groups[0].id, '__world__');
    });

    it('handles case where there is no Public group', () => {
      const userGroups = [];
      const featuredGroups = [];

      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar'
      );
      assert.deepEqual(groups, []);
    });

    [
      {
        description: 'sets `isScopedToUri` to true if `scopes` is missing',
        scopes: undefined,
        shouldBeSelectable: true,
        uri: 'https://foo.com/bar',
      },
      {
        description:
          'sets `isScopedToUri` to true if `scopes.enforced` is false',
        scopes: { enforced: false },
        shouldBeSelectable: true,
        uri: 'https://foo.com/bar',
      },
      {
        description:
          'sets `isScopedToUri` to true if at least one of the `scopes.uri_patterns` match the uri',
        scopes: {
          enforced: true,
          uri_patterns: ['http://foo.com*', 'https://foo.com*'],
        },
        shouldBeSelectable: true,
        uri: 'https://foo.com/bar',
      },
      {
        description:
          'sets `isScopedToUri` to false if `scopes.uri_patterns` do not match the uri',
        scopes: { enforced: true, uri_patterns: ['http://foo.com*'] },
        shouldBeSelectable: false,
        uri: 'https://foo.com/bar',
      },
      {
        description: 'it permits multiple *s in the scopes uri pattern',
        scopes: { enforced: true, uri_patterns: ['https://foo.com*bar*'] },
        shouldBeSelectable: true,
        uri: 'https://foo.com/boo/bar/baz',
      },
      {
        description: 'it escapes non-* chars in the scopes uri pattern',
        scopes: {
          enforced: true,
          uri_patterns: ['https://foo.com?bar=foo$[^]($){mu}+&boo=*'],
        },
        shouldBeSelectable: true,
        uri: 'https://foo.com?bar=foo$[^]($){mu}+&boo=foo',
      },
    ].forEach(({ description, scopes, shouldBeSelectable, uri }) => {
      it(description, () => {
        const userGroups = [{ id: 'groupa', name: 'GroupA', scopes: scopes }];
        const featuredGroups = [];

        const groups = combineGroups(userGroups, featuredGroups, uri);

        groups.forEach(g => assert.equal(g.isScopedToUri, shouldBeSelectable));
      });
    });

    it('adds `isScopedToUri` property to groups', () => {
      const userGroups = [{ id: 'one', name: 'GroupA' }];
      const featuredGroups = [{ id: '__world__', name: 'Public' }];

      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar'
      );

      groups.forEach(g => assert.equal(g.isScopedToUri, true));
    });
  });
});
