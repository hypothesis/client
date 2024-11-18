import { combineGroups, normalizeGroupIds, $imports } from '../groups';

describe('sidebar/helpers/groups', () => {
  let fakeServiceConfig;

  describe('combineGroups', () => {
    beforeEach(() => {
      fakeServiceConfig = sinon.stub().returns(null);
      $imports.$mock({
        '../config/service-config': { serviceConfig: fakeServiceConfig },
      });
    });

    it('labels groups in both lists as `isMember` true', () => {
      const userGroups = [{ id: 'groupa', name: 'GroupA' }];
      const featuredGroups = [{ id: 'groupa', name: 'GroupA' }];
      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar',
      );
      const groupA = groups.find(g => g.id === 'groupa');
      assert.equal(groupA.isMember, true);
    });

    // `allowLeavingGroups` defaults to true for first party users and false
    // for third-party users.
    [null, { allowLeavingGroups: true }, { allowLeavingGroups: 1 }].forEach(
      serviceConfig => {
        it('sets `canLeave` to true if user is a member and leaving groups is enabled', () => {
          fakeServiceConfig.returns(serviceConfig);
          const userGroups = [
            { id: 'groupa', name: 'GroupA', type: 'private' },
            { id: 'groupc', name: 'GroupC', type: 'open' },
            { id: 'groupd', name: 'GroupD', type: 'restricted' },
          ];
          const featuredGroups = [
            { id: 'groupb', name: 'GroupB', type: 'open' },
          ];
          const groups = combineGroups(
            userGroups,
            featuredGroups,
            'https://foo.com/bar',
          );

          const expected = [
            {
              id: 'groupa',
              canLeave: true,
            },
            {
              id: 'groupb',
              canLeave: false,
            },
            {
              id: 'groupc',
              canLeave: true,
            },
            {
              id: 'groupd',
              canLeave: true,
            },
          ];

          for (const { id, canLeave } of expected) {
            const group = groups.find(g => g.id === id);
            assert.strictEqual(
              group.canLeave,
              canLeave,
              `incorrect canLeave for group ${id}`,
            );
          }
        });
      },
    );

    [{}, { allowLeavingGroups: false }, { allowLeavingGroups: null }].forEach(
      serviceConfig => {
        it('sets `canLeave` to false for all groups if leaving groups is disabled', () => {
          fakeServiceConfig.returns(serviceConfig);
          const userGroups = [
            { id: 'groupa', name: 'GroupA', type: 'private' },
          ];
          const featuredGroups = [
            { id: 'groupb', name: 'GroupB', type: 'open' },
          ];
          const groups = combineGroups(
            userGroups,
            featuredGroups,
            'https://foo.com/bar',
          );
          const groupA = groups.find(g => g.id === 'groupa');
          const groupB = groups.find(g => g.id === 'groupb');
          assert.equal(groupA.canLeave, false);
          assert.equal(groupB.canLeave, false);
        });
      },
    );

    it('sets `canLeave` to false for the `__world__` group', () => {
      const userGroups = [
        { id: '__world__', name: 'Public', type: 'open' },
        { id: 'groupa', name: 'GroupA', type: 'private' },
        { id: 'groupc', name: 'GroupC', type: 'open' },
        { id: 'groupd', name: 'GroupD', type: 'restricted' },
      ];
      const groups = combineGroups(userGroups, [], 'https://foo.com/bar');

      const expected = [
        {
          id: '__world__',
          canLeave: false,
        },
        {
          id: 'groupa',
          canLeave: true,
        },
        {
          id: 'groupc',
          canLeave: true,
        },
        {
          id: 'groupd',
          canLeave: true,
        },
      ];

      for (const { id, canLeave } of expected) {
        const group = groups.find(g => g.id === id);
        assert.strictEqual(group.canLeave, canLeave);
      }
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
        'https://foo.com/bar',
      );
      const ids = groups.map(g => g.id);
      assert.deepEqual(ids, ['__world__', 'groupa', 'groupb']);
    });

    it('adds `isMember` attribute to each group', () => {
      const userGroups = [{ id: 'groupa', name: 'GroupA' }];
      const featuredGroups = [
        { id: 'groupb', name: 'GroupB' },
        { id: '__world__', name: 'Public' },
      ];

      const expectedMembership = {
        __world__: false,
        groupa: true,
        groupb: false,
      };

      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar',
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
        'https://foo.com/bar',
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
        'https://foo.com/bar',
      );
      assert.equal(groups[0].id, '__world__');
    });

    it('handles case where there is no Public group', () => {
      const userGroups = [];
      const featuredGroups = [];

      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar',
      );
      assert.deepEqual(groups, []);
    });

    [
      {
        description: 'sets `isScopedToUri` to true if `scopes` is missing',
        scopes: undefined,
        isScopedToUri: true,
        uri: 'https://foo.com/bar',
      },
      {
        description:
          'sets `isScopedToUri` to true if `scopes.uri_patterns` is empty',
        scopes: { uri_patterns: [] },
        isScopedToUri: true,
        uri: 'https://foo.com/bar',
      },
      {
        description:
          'sets `isScopedToUri` to true if at least one of the `scopes.uri_patterns` match the uri',
        scopes: {
          enforced: true,
          uri_patterns: ['http://foo.com*', 'https://foo.com*'],
        },
        isScopedToUri: true,
        uri: 'https://foo.com/bar',
      },
      {
        description:
          'sets `isScopedToUri` to false if `scopes.uri_patterns` do not match the uri',
        scopes: { enforced: true, uri_patterns: ['http://foo.com*'] },
        isScopedToUri: false,
        uri: 'https://foo.com/bar',
      },
      {
        description: 'sets `isScopedToUri` to true if `uri` is null',
        scopes: { enforced: true, uri_patterns: ['http://foo.com*'] },
        isScopedToUri: true,
        uri: null,
      },
      {
        description: 'it permits multiple *s in the scopes uri pattern',
        scopes: { enforced: true, uri_patterns: ['https://foo.com*bar*'] },
        isScopedToUri: true,
        uri: 'https://foo.com/boo/bar/baz',
      },
      {
        description: 'it escapes non-* chars in the scopes uri pattern',
        scopes: {
          enforced: true,
          uri_patterns: ['https://foo.com?bar=foo$[^]($){mu}+&boo=*'],
        },
        isScopedToUri: true,
        uri: 'https://foo.com?bar=foo$[^]($){mu}+&boo=foo',
      },
    ].forEach(({ description, scopes, isScopedToUri, uri }) => {
      it(description, () => {
        const userGroups = [{ id: 'groupa', name: 'GroupA', scopes }];
        const featuredGroups = [];

        const groups = combineGroups(userGroups, featuredGroups, uri);

        groups.forEach(g => assert.equal(g.isScopedToUri, isScopedToUri));
      });
    });

    it('adds `isScopedToUri` property to groups', () => {
      const userGroups = [{ id: 'one', name: 'GroupA' }];
      const featuredGroups = [{ id: '__world__', name: 'Public' }];

      const groups = combineGroups(
        userGroups,
        featuredGroups,
        'https://foo.com/bar',
      );

      groups.forEach(g => assert.equal(g.isScopedToUri, true));
    });
  });

  describe('normalizeGroupIds', () => {
    const allGroups = [
      { id: 'group1', groupid: 'group:group1@foo.com' },
      { id: 'group2', groupid: 'group:group2@foo.com' },
      { id: 'group3', groupid: 'group:group3@foo.com' },
      { id: 'group4' },
      { id: 'group5' },
      { id: 'group6', groupid: 'group:group6@foo.com' },
    ];

    [
      {
        description: 'all `groupIds` are `id`s and have matches in `groups`',
        groupIds: ['group1', 'group2', 'group3', 'group4', 'group5', 'group6'],
        groups: allGroups,
        expected: ['group1', 'group2', 'group3', 'group4', 'group5', 'group6'],
      },
      {
        description:
          '`groupIds` is a mix of `id`s and `groupIds` and all have matches in `groups`',
        groupIds: [
          'group:group1@foo.com',
          'group:group2@foo.com',
          'group:group3@foo.com',
          'group4',
          'group5',
          'group:group6@foo.com',
        ],
        groups: allGroups,
        expected: ['group1', 'group2', 'group3', 'group4', 'group5', 'group6'],
      },
      {
        description:
          '`groupIds` is a mix of `id`s and `groupIds` and some have matches in `groups`',
        groupIds: [
          'group4',
          'group:group6@foo.com',
          'group7',
          'group:group5@foo.com',
        ],
        groups: allGroups,
        expected: ['group4', 'group6'],
      },
      {
        description:
          '`groupIds` is a mix of `id`s and `groupIds` and none match any `groups`',
        groupIds: ['group7', 'group:group5@foo.com', 'fingers'],
        groups: allGroups,
        expected: [],
      },
      {
        description: '`groupIds` is empty',
        groupIds: [],
        groups: allGroups,
        expected: [],
      },
    ].forEach(testCase => {
      it(`returns the correct set of IDs when ${testCase.description}`, () => {
        assert.deepEqual(
          normalizeGroupIds(testCase.groupIds, testCase.groups),
          testCase.expected,
        );
      });
    });
  });
});
