'use strict';

const events = require('../../events');
const fakeReduxStore = require('../../test/fake-redux-store');
const groups = require('../groups');

/**
 * Generate a truth table containing every possible combination of a set of
 * boolean inputs.
 *
 * @param {number} columns
 * @return {Array<boolean[]>}
 */
function truthTable(columns) {
  if (columns === 1) {
    return [[true], [false]];
  }
  const subTable = truthTable(columns - 1);
  return [
    ...subTable.map(row => [true, ...row]),
    ...subTable.map(row => [false, ...row]),
  ];
}

// Return a mock session service containing three groups.
const sessionWithThreeGroups = function() {
  return {
    state: {},
  };
};

const dummyGroups = [
  {
    name: 'Group 1',
    id: 'id1',
    scopes: { enforced: true, uri_patterns: ['*'] },
  },
  { name: 'Group 2', id: 'id2' },
  { name: 'Group 3', id: 'id3' },
];

describe('groups', function() {
  let fakeAuth;
  let fakeFeatures;
  let fakeStore;
  let fakeIsSidebar;
  let fakeSession;
  let fakeSettings;
  let fakeApi;
  let fakeLocalStorage;
  let fakeRootScope;
  let fakeServiceUrl;
  let sandbox;

  beforeEach(function() {
    fakeAuth = {
      tokenGetter: sinon.stub().returns('1234'),
    };
    fakeFeatures = {
      flagEnabled: sinon.stub().returns(false),
    };
    sandbox = sinon.sandbox.create();

    fakeStore = fakeReduxStore(
      {
        searchUris: ['http://example.org'],
        focusedGroup: null,
        groups: [],
      },
      {
        focusGroup: sinon.stub(),
        getGroup: sinon.stub(),
        loadGroups: sinon.stub(),
        allGroups() {
          return this.getState().groups;
        },
        focusedGroup() {
          return this.getState().focusedGroup;
        },
        searchUris() {
          return this.getState().searchUris;
        },
        focusedGroupId() {
          const group = this.getState().focusedGroup;
          return group ? group.id : null;
        },
      }
    );
    fakeSession = sessionWithThreeGroups();
    fakeIsSidebar = true;
    fakeLocalStorage = {
      getItem: sandbox.stub(),
      setItem: sandbox.stub(),
    };
    fakeRootScope = {
      eventCallbacks: {},

      $apply: function(callback) {
        callback();
      },

      $on: function(event, callback) {
        if (event === events.USER_CHANGED || event === events.FRAME_CONNECTED) {
          this.eventCallbacks[event] = callback;
        }
      },

      $broadcast: sandbox.stub(),
    };
    fakeApi = {
      annotation: {
        get: sinon.stub(),
      },

      group: {
        member: {
          delete: sandbox.stub().returns(Promise.resolve()),
        },
      },
      groups: {
        list: sandbox.stub().returns(
          Promise.resolve({
            data: dummyGroups,
            token: '1234',
          })
        ),
      },
      profile: {
        groups: {
          read: sandbox.stub().returns(Promise.resolve([dummyGroups[0]])),
        },
      },
    };
    fakeServiceUrl = sandbox.stub();
    fakeSettings = {};
  });

  afterEach(function() {
    sandbox.restore();
  });

  function service() {
    return groups(
      fakeRootScope,
      fakeStore,
      fakeApi,
      fakeIsSidebar,
      fakeLocalStorage,
      fakeServiceUrl,
      fakeSession,
      fakeSettings,
      fakeAuth,
      fakeFeatures
    );
  }

  describe('#all', function() {
    it('returns all groups', function() {
      const svc = service();
      fakeStore.setState({ groups: dummyGroups });
      assert.deepEqual(svc.all(), dummyGroups);
    });
  });

  describe('#load', function() {
    it('combines groups from both endpoints if community-groups feature flag is set', function() {
      const svc = service();

      const groups = [
        { id: 'groupa', name: 'GroupA' },
        { id: 'groupb', name: 'GroupB' },
      ];

      fakeApi.profile.groups.read.returns(Promise.resolve(groups));
      fakeApi.groups.list.returns(Promise.resolve([groups[0]]));
      fakeFeatures.flagEnabled.withArgs('community_groups').returns(true);

      return svc.load().then(() => {
        assert.calledWith(fakeStore.loadGroups, groups);
      });
    });

    it('loads all available groups', function() {
      const svc = service();

      return svc.load().then(() => {
        assert.calledWith(fakeStore.loadGroups, dummyGroups);
      });
    });

    it('always sends the `expand` parameter', function() {
      const svc = service();
      return svc.load().then(() => {
        const call = fakeApi.groups.list.getCall(0);
        assert.isObject(call.args[0]);
        assert.equal(call.args[0].expand, 'organization');
      });
    });

    it('sends `expand` parameter when community-groups feature flag is enabled', function() {
      const svc = service();
      fakeApi.groups.list.returns(
        Promise.resolve([{ id: 'groupa', name: 'GroupA' }])
      );
      fakeFeatures.flagEnabled.withArgs('community_groups').returns(true);

      return svc.load().then(() => {
        assert.calledWith(
          fakeApi.profile.groups.read,
          sinon.match({ expand: ['organization', 'scopes'] })
        );
        assert.calledWith(
          fakeApi.groups.list,
          sinon.match({ expand: ['organization', 'scopes'] })
        );
      });
    });

    it('sets the focused group from the value saved in local storage', () => {
      const svc = service();
      fakeLocalStorage.getItem.returns(dummyGroups[1].id);
      return svc.load().then(() => {
        assert.calledWith(fakeStore.focusGroup, dummyGroups[1].id);
      });
    });

    [null, 'some-group-id'].forEach(groupId => {
      it('does not set the focused group if not present in the groups list', () => {
        const svc = service();
        fakeLocalStorage.getItem.returns(groupId);
        return svc.load().then(() => {
          assert.notCalled(fakeStore.focusGroup);
        });
      });
    });

    context('in the sidebar', () => {
      it('waits for the document URL to be determined', () => {
        const svc = service();

        fakeStore.setState({ searchUris: [] });
        const loaded = svc.load();
        fakeStore.setState({ searchUris: ['https://asite.com'] });

        return loaded.then(() => {
          assert.calledWith(fakeApi.groups.list, {
            document_uri: 'https://asite.com',
            expand: 'organization',
          });
        });
      });
    });

    context('in the stream and single annotation page', () => {
      beforeEach(() => {
        fakeIsSidebar = false;
      });

      it('does not wait for the document URL', () => {
        fakeStore.setState({ searchUris: [] });
        const svc = service();
        return svc.load().then(() => {
          assert.calledWith(fakeApi.groups.list, {
            expand: 'organization',
          });
        });
      });

      it('does not wait for the document URL when community_groups feature flag is on', () => {
        fakeStore.setState({ searchUris: [] });
        fakeApi.groups.list.returns(Promise.resolve(dummyGroups));
        fakeApi.profile.groups.read.returns(Promise.resolve([]));
        fakeFeatures.flagEnabled.withArgs('community_groups').returns(true);
        const svc = service();
        return svc.load().then(() => {
          assert.calledWith(fakeApi.groups.list, {
            expand: ['organization', 'scopes'],
          });
        });
      });
    });

    it('passes authority argument when using a third-party authority', () => {
      fakeSettings.services = [{ authority: 'publisher.org' }];
      const svc = service();
      return svc.load().then(() => {
        assert.calledWith(
          fakeApi.groups.list,
          sinon.match({ authority: 'publisher.org' })
        );
      });
    });

    it('injects a defalt organization if group is missing an organization', function() {
      const svc = service();
      const groups = [{ id: '39r39f', name: 'Ding Dong!' }];
      fakeApi.groups.list.returns(
        Promise.resolve({
          token: '1234',
          data: groups,
        })
      );
      return svc.load().then(groups => {
        assert.isObject(groups[0].organization);
        assert.hasAllKeys(groups[0].organization, ['id', 'logo']);
      });
    });

    truthTable(3).forEach(
      ([loggedIn, pageHasAssociatedGroups, directLinkToPublicAnnotation]) => {
        it('excludes the "Public" group if user logged out and page has associated groups', () => {
          const svc = service();
          const shouldShowPublicGroup =
            loggedIn ||
            !pageHasAssociatedGroups ||
            directLinkToPublicAnnotation;

          // Setup the direct-linked annotation.
          if (directLinkToPublicAnnotation) {
            fakeApi.annotation.get.returns(
              Promise.resolve({
                id: 'direct-linked-ann',
                group: '__world__',
              })
            );
            fakeSettings.annotations = 'direct-linked-ann';
          } else {
            fakeSettings.annotations = null;
          }

          // Create groups response from server.
          const groups = [{ name: 'Public', id: '__world__' }];
          if (pageHasAssociatedGroups) {
            groups.push({ name: 'BioPub', id: 'biopub' });
          }

          fakeApi.groups.list.returns(
            Promise.resolve({
              token: loggedIn ? '1234' : null,
              data: groups,
            })
          );

          return svc.load().then(groups => {
            const publicGroupShown = groups.some(g => g.id === '__world__');
            assert.equal(publicGroupShown, shouldShowPublicGroup);
          });
        });
      }
    );

    [
      {
        description: 'shows service groups',
        services: [{ groups: ['abc123'] }],
        expected: ['abc123'],
      },
      {
        description: 'also supports identifying service groups by groupid',
        services: [{ groups: ['group:42@example.com'] }],
        expected: ['abc123'],
      },
      {
        description: 'only shows service groups that exist',
        services: [{ groups: ['abc123', 'no_exist'] }],
        expected: ['abc123'],
      },
      {
        description: 'shows no groups if no service groups exist',
        services: [{ groups: ['no_exist'] }],
        expected: [],
      },
      {
        description: 'shows all groups if service is null',
        services: null,
        expected: ['__world__', 'abc123', 'def456'],
      },
      {
        description: 'shows all groups if service groups does not exist',
        services: [{}],
        expected: ['__world__', 'abc123', 'def456'],
      },
    ].forEach(({ description, services, expected }) => {
      it(description, () => {
        fakeSettings.services = services;
        const svc = service();

        // Create groups response from server.
        const groups = [
          { name: 'Public', id: '__world__' },
          { name: 'ABC', id: 'abc123', groupid: 'group:42@example.com' },
          { name: 'DEF', id: 'def456', groupid: null },
        ];

        fakeApi.groups.list.returns(
          Promise.resolve({
            token: '1234',
            data: groups,
          })
        );

        return svc.load().then(groups => {
          let displayedGroups = groups.map(g => g.id);
          assert.deepEqual(displayedGroups, expected);
        });
      });
    });
  });

  describe('#get', function() {
    it('returns the requested group', function() {
      const svc = service();
      fakeStore.getGroup.withArgs('foo').returns(dummyGroups[1]);

      assert.equal(svc.get('foo'), dummyGroups[1]);
    });
  });

  describe('#focused', function() {
    it('returns the focused group', function() {
      const svc = service();
      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[2] });
      assert.equal(svc.focused(), dummyGroups[2]);
    });
  });

  describe('#focus', function() {
    it('sets the focused group to the named group', function() {
      const svc = service();
      svc.focus('foo');
      assert.calledWith(fakeStore.focusGroup, 'foo');
    });
  });

  context('when the focused group changes', () => {
    it('stores the focused group id in localStorage', function() {
      service();

      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[1] });

      assert.calledWithMatch(
        fakeLocalStorage.setItem,
        sinon.match.any,
        dummyGroups[1].id
      );
    });

    it('emits the GROUP_FOCUSED event if the focused group changed', function() {
      service();

      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[1] });

      assert.calledWith(
        fakeRootScope.$broadcast,
        events.GROUP_FOCUSED,
        dummyGroups[1].id
      );
    });

    it('does not emit GROUP_FOCUSED if the focused group did not change', () => {
      service();

      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[1] });
      fakeRootScope.$broadcast.reset();
      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[1] });

      assert.notCalled(fakeRootScope.$broadcast);
    });
  });

  describe('#leave', function() {
    it('should call the group leave API', function() {
      const s = service();
      return s.leave('id2').then(() => {
        assert.calledWithMatch(fakeApi.group.member.delete, {
          pubid: 'id2',
          userid: 'me',
        });
      });
    });
  });

  describe('calls load on various events', function() {
    it('refetches groups when the logged-in user changes', () => {
      service();

      return fakeRootScope.eventCallbacks[events.USER_CHANGED]().then(() => {
        assert.calledOnce(fakeApi.groups.list);
      });
    });

    context('when a new frame connects', () => {
      it('should refetch groups if main frame URL has changed', () => {
        const svc = service();

        fakeStore.setState({ searchUris: ['https://domain.com/page-a'] });
        return svc
          .load()
          .then(() => {
            // Simulate main frame URL change, eg. due to client-side navigation in
            // a single page application.
            fakeApi.groups.list.resetHistory();
            fakeStore.setState({ searchUris: ['https://domain.com/page-b'] });

            return fakeRootScope.eventCallbacks[events.FRAME_CONNECTED]();
          })
          .then(() => {
            assert.calledOnce(fakeApi.groups.list);
          });
      });

      it('should not refetch groups if main frame URL has not changed', () => {
        const svc = service();

        fakeStore.setState({ searchUris: ['https://domain.com/page-a'] });
        return svc
          .load()
          .then(() => {
            return fakeRootScope.eventCallbacks[events.FRAME_CONNECTED]();
          })
          .then(() => {
            assert.calledOnce(fakeApi.groups.list);
          });
      });
    });
  });
});
