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
    scopes: { enforced: false, uri_patterns: ['http://foo.com'] },
  },
  { name: 'Group 2', id: 'id2' },
  { name: 'Group 3', id: 'id3' },
];

describe('groups', function() {
  let fakeAuth;
  let fakeStore;
  let fakeIsSidebar;
  let fakeSession;
  let fakeSettings;
  let fakeApi;
  let fakeLocalStorage;
  let fakeRootScope;
  let fakeServiceUrl;

  beforeEach(function() {
    fakeAuth = {
      tokenGetter: sinon.stub().returns('1234'),
    };

    fakeStore = fakeReduxStore(
      {
        mainFrame: { uri: 'http://example.org' },
        focusedGroup: null,
        groups: [],
        directLinkedGroupId: null,
        directLinkedAnnotationId: null,
      },
      {
        focusGroup: sinon.stub(),
        getGroup: sinon.stub(),
        loadGroups: sinon.stub(),
        allGroups() {
          return this.getState().groups;
        },
        getInScopeGroups() {
          return this.getState().groups;
        },
        focusedGroup() {
          return this.getState().focusedGroup;
        },
        mainFrame() {
          return this.getState().mainFrame;
        },
        focusedGroupId() {
          const group = this.getState().focusedGroup;
          return group ? group.id : null;
        },
        setDirectLinkedGroupFetchFailed: sinon.stub(),
        clearDirectLinkedGroupFetchFailed: sinon.stub(),
      }
    );
    fakeSession = sessionWithThreeGroups();
    fakeIsSidebar = true;
    fakeLocalStorage = {
      getItem: sinon.stub(),
      setItem: sinon.stub(),
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

      $broadcast: sinon.stub(),
    };
    fakeApi = {
      annotation: {
        get: sinon.stub(),
      },

      group: {
        member: {
          delete: sinon.stub().returns(Promise.resolve()),
        },
        read: sinon.stub().returns(Promise.resolve(new Error('404 Error'))),
      },
      groups: {
        list: sinon.stub().returns(dummyGroups),
      },
      profile: {
        groups: {
          read: sinon.stub().returns(Promise.resolve([dummyGroups[0]])),
        },
      },
    };
    fakeServiceUrl = sinon.stub();
    fakeSettings = { group: null };
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
      fakeAuth
    );
  }

  describe('#all', function() {
    it('returns all groups from store.allGroups', () => {
      const svc = service();
      fakeStore.allGroups = sinon.stub().returns(dummyGroups);
      assert.deepEqual(svc.all(), dummyGroups);
      assert.called(fakeStore.allGroups);
    });
  });

  describe('#load', function() {
    it('filters out direct-linked groups that are out of scope and scope enforced', () => {
      const svc = service();
      fakeLocalStorage.getItem.returns(dummyGroups[0].id);
      const outOfScopeEnforcedGroup = {
        id: 'oos',
        scopes: { enforced: true, uri_patterns: ['http://foo.com'] },
      };
      fakeStore.setState({
        directLinkedGroupId: outOfScopeEnforcedGroup.id,
      });
      fakeApi.group.read.returns(Promise.resolve(outOfScopeEnforcedGroup));
      return svc.load().then(groups => {
        // The failure state is captured in the store.
        assert.called(fakeStore.setDirectLinkedGroupFetchFailed);
        // The focus group is not set to the direct-linked group.
        assert.calledWith(fakeStore.focusGroup, dummyGroups[0].id);
        // The direct-linked group is not in the list of groups.
        assert.isFalse(groups.some(g => g.id === outOfScopeEnforcedGroup.id));
      });
    });

    it('catches error from api.group.read request', () => {
      const svc = service();
      fakeLocalStorage.getItem.returns(dummyGroups[0].id);
      fakeStore.setState({ directLinkedGroupId: 'does-not-exist' });
      fakeApi.group.read.returns(
        Promise.reject(
          new Error(
            "404 Not Found: Either the resource you requested doesn't exist, \
          or you are not currently authorized to see it."
          )
        )
      );
      return svc.load().then(() => {
        // The failure state is captured in the store.
        assert.called(fakeStore.setDirectLinkedGroupFetchFailed);
        // The focus group is not set to the direct-linked group.
        assert.calledWith(fakeStore.focusGroup, dummyGroups[0].id);
      });
    });

    it('combines groups from both endpoints', function() {
      const svc = service();

      const groups = [
        { id: 'groupa', name: 'GroupA' },
        { id: 'groupb', name: 'GroupB' },
      ];

      fakeApi.profile.groups.read.returns(Promise.resolve(groups));
      fakeApi.groups.list.returns(Promise.resolve([groups[0]]));

      return svc.load().then(() => {
        assert.calledWith(fakeStore.loadGroups, groups);
      });
    });

    // TODO: Add a de-dup test for the direct-linked annotation.

    it('does not duplicate groups if the direct-linked group is also a featured group', () => {
      const svc = service();

      // Set the direct-linked group to dummyGroups[0].
      fakeStore.setState({ directLinkedGroupId: dummyGroups[0].id });
      fakeApi.group.read.returns(Promise.resolve(dummyGroups[0]));

      // Include the dummyGroups[0] in the featured groups.
      fakeApi.profile.groups.read.returns(Promise.resolve([]));
      fakeApi.groups.list.returns(Promise.resolve([dummyGroups[0]]));

      return svc.load().then(groups => {
        const groupIds = groups.map(g => g.id);
        assert.deepEqual(groupIds, [dummyGroups[0].id]);
      });
    });

    it('combines groups from all 3 endpoints if there is a selectedGroup', () => {
      const svc = service();

      fakeStore.setState({ directLinkedGroupId: 'selected-id' });
      const groups = [
        { id: 'groupa', name: 'GroupA' },
        { id: 'groupb', name: 'GroupB' },
        { id: 'selected-id', name: 'Selected Group' },
      ];

      fakeApi.profile.groups.read.returns(Promise.resolve([groups[0]]));
      fakeApi.groups.list.returns(Promise.resolve([groups[1]]));
      fakeApi.group.read.returns(Promise.resolve(groups[2]));

      return svc.load().then(() => {
        assert.calledWith(fakeStore.loadGroups, groups);
      });
    });

    it('passes the direct-linked group id from the store to the api.group.read call', () => {
      const svc = service();

      fakeStore.setState({ directLinkedGroupId: 'selected-id' });
      const group = { id: 'selected-id', name: 'Selected Group' };

      fakeApi.profile.groups.read.returns(Promise.resolve([]));
      fakeApi.groups.list.returns(Promise.resolve([]));
      fakeApi.group.read.returns(Promise.resolve(group));

      return svc.load().then(() => {
        assert.calledWith(
          fakeApi.group.read,
          sinon.match({
            id: 'selected-id',
          })
        );
      });
    });

    it('loads all available groups', function() {
      const svc = service();

      return svc.load().then(() => {
        assert.calledWith(fakeStore.loadGroups, dummyGroups);
      });
    });

    it('sends `expand` parameter', function() {
      const svc = service();
      fakeApi.groups.list.returns(
        Promise.resolve([{ id: 'groupa', name: 'GroupA' }])
      );
      fakeStore.setState({ directLinkedGroupId: 'group-id' });

      return svc.load().then(() => {
        assert.calledWith(
          fakeApi.profile.groups.read,
          sinon.match({ expand: ['organization', 'scopes'] })
        );
        assert.calledWith(
          fakeApi.groups.list,
          sinon.match({ expand: ['organization', 'scopes'] })
        );
        assert.calledWith(
          fakeApi.group.read,
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

    it("sets the direct-linked annotation's group to take precedence over the group saved in local storage and the direct-linked group", () => {
      const svc = service();
      fakeStore.setState({
        directLinkedAnnotationId: 'ann-id',
        directLinkedGroupId: dummyGroups[1].id,
      });
      fakeLocalStorage.getItem.returns(dummyGroups[0].id);
      fakeApi.groups.list.returns(Promise.resolve(dummyGroups));
      fakeApi.annotation.get.returns(
        Promise.resolve({
          id: 'ann-id',
          group: dummyGroups[2].id,
        })
      );
      return svc.load().then(() => {
        assert.calledWith(fakeStore.focusGroup, dummyGroups[2].id);
      });
    });

    it("sets the focused group to the direct-linked annotation's group", () => {
      const svc = service();
      fakeStore.setState({ directLinkedAnnotationId: 'ann-id' });
      fakeApi.groups.list.returns(Promise.resolve(dummyGroups));
      fakeLocalStorage.getItem.returns(dummyGroups[0].id);
      fakeApi.annotation.get.returns(
        Promise.resolve({
          id: 'ann-id',
          group: dummyGroups[1].id,
        })
      );
      return svc.load().then(() => {
        assert.calledWith(fakeStore.focusGroup, dummyGroups[1].id);
      });
    });

    it('sets the direct-linked group to take precedence over the group saved in local storage', () => {
      const svc = service();
      fakeStore.setState({ directLinkedGroupId: dummyGroups[1].id });
      fakeLocalStorage.getItem.returns(dummyGroups[0].id);
      fakeApi.groups.list.returns(Promise.resolve(dummyGroups));
      return svc.load().then(() => {
        assert.calledWith(fakeStore.focusGroup, dummyGroups[1].id);
      });
    });

    it('sets the focused group to the direct-linked group', () => {
      const svc = service();
      fakeStore.setState({ directLinkedGroupId: dummyGroups[1].id });
      fakeApi.groups.list.returns(Promise.resolve(dummyGroups));
      return svc.load().then(() => {
        assert.calledWith(fakeStore.focusGroup, dummyGroups[1].id);
      });
    });

    it('clears the directLinkedGroupFetchFailed state if loading a direct-linked group', () => {
      const svc = service();
      fakeStore.setState({ directLinkedGroupId: dummyGroups[1].id });
      fakeApi.groups.list.returns(Promise.resolve(dummyGroups));
      return svc.load().then(() => {
        assert.called(fakeStore.clearDirectLinkedGroupFetchFailed);
        assert.notCalled(fakeStore.setDirectLinkedGroupFetchFailed);
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

        fakeStore.setState({ mainFrame: null });
        const loaded = svc.load();
        fakeStore.setState({ mainFrame: { uri: 'https://asite.com' } });

        return loaded.then(() => {
          assert.calledWith(fakeApi.groups.list, {
            document_uri: 'https://asite.com',
            expand: ['organization', 'scopes'],
          });
        });
      });
    });

    context('in the stream and single annotation page', () => {
      beforeEach(() => {
        fakeIsSidebar = false;
      });

      it('does not wait for the document URL', () => {
        fakeStore.setState({ mainFrame: null });
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
      fakeApi.groups.list.returns(Promise.resolve(groups));
      return svc.load().then(groups => {
        assert.isObject(groups[0].organization);
        assert.hasAllKeys(groups[0].organization, ['id', 'logo']);
      });
    });

    it('catches error when fetching the direct-linked annotation', () => {
      const svc = service();

      fakeStore.setState({ directLinkedAnnotationId: 'ann-id' });

      fakeApi.profile.groups.read.returns(Promise.resolve([]));
      fakeApi.groups.list.returns(
        Promise.resolve([{ name: 'BioPub', id: 'biopub' }])
      );
      fakeApi.annotation.get.returns(
        Promise.reject(
          new Error(
            "404 Not Found: Either the resource you requested doesn't exist, \
          or you are not currently authorized to see it."
          )
        )
      );

      return svc.load().then(groups => {
        const groupIds = groups.map(g => g.id);
        assert.deepEqual(groupIds, ['biopub']);
      });
    });

    it("catches error when fetching the direct-linked annotation's group", () => {
      const svc = service();

      fakeStore.setState({ directLinkedAnnotationId: 'ann-id' });

      fakeApi.profile.groups.read.returns(Promise.resolve([]));
      fakeApi.groups.list.returns(
        Promise.resolve([
          { name: 'BioPub', id: 'biopub' },
          { name: 'Public', id: '__world__' },
        ])
      );
      fakeApi.group.read.returns(
        Promise.reject(
          new Error(
            "404 Not Found: Either the resource you requested doesn't exist, \
          or you are not currently authorized to see it."
          )
        )
      );
      fakeApi.annotation.get.returns(
        Promise.resolve({
          id: 'ann-id',
          group: 'out-of-scope',
        })
      );

      // The user is logged out.
      fakeAuth.tokenGetter.returns(null);

      return svc.load().then(groups => {
        const groupIds = groups.map(g => g.id);
        assert.deepEqual(groupIds, ['biopub']);
      });
    });

    it("includes the direct-linked annotation's group when it is not in the normal list of groups", () => {
      const svc = service();

      fakeStore.setState({ directLinkedAnnotationId: 'ann-id' });

      fakeApi.profile.groups.read.returns(Promise.resolve([]));
      fakeApi.groups.list.returns(
        Promise.resolve([
          { name: 'BioPub', id: 'biopub' },
          { name: 'Public', id: '__world__' },
        ])
      );
      fakeApi.group.read.returns(
        Promise.resolve({ name: 'Restricted', id: 'out-of-scope' })
      );
      fakeApi.annotation.get.returns(
        Promise.resolve({
          id: 'ann-id',
          group: 'out-of-scope',
        })
      );

      return svc.load().then(groups => {
        const directLinkedAnnGroupShown = groups.some(
          g => g.id === 'out-of-scope'
        );
        assert.isTrue(directLinkedAnnGroupShown);
      });
    });

    it('both groups are in the final groups list when an annotation and a group are linked to', () => {
      // This can happen if the linked to annotation and group are configured by
      // the frame embedding the client.
      const svc = service();

      fakeStore.setState({
        directLinkedGroupId: 'out-of-scope',
        directLinkedAnnotationId: 'ann-id',
      });

      fakeApi.profile.groups.read.returns(Promise.resolve([]));
      fakeApi.groups.list.returns(
        Promise.resolve([
          { name: 'BioPub', id: 'biopub' },
          { name: 'Public', id: '__world__' },
        ])
      );
      fakeApi.group.read.returns(
        Promise.resolve({ name: 'Restricted', id: 'out-of-scope' })
      );
      fakeApi.annotation.get.returns(
        Promise.resolve({
          id: 'ann-id',
          group: '__world__',
        })
      );

      // The user is logged out.
      fakeAuth.tokenGetter.returns(null);

      return svc.load().then(groups => {
        const linkedToGroupShown = groups.some(g => g.id === 'out-of-scope');
        assert.isTrue(linkedToGroupShown);
        const linkedToAnnGroupShown = groups.some(g => g.id === '__world__');
        assert.isTrue(linkedToAnnGroupShown);
      });
    });

    it('includes the "Public" group if the user links to it', () => {
      // Set up the test under conditions that would otherwise
      // not return the Public group. Aka: the user is logged
      // out and there are associated groups.
      const svc = service();

      fakeStore.setState({
        directLinkedGroupId: '__world__',
        directLinkedAnnotationId: null,
      });

      fakeApi.profile.groups.read.returns(Promise.resolve([]));
      fakeApi.groups.list.returns(
        Promise.resolve([
          { name: 'BioPub', id: 'biopub' },
          { name: 'Public', id: '__world__' },
        ])
      );
      fakeApi.group.read.returns(
        Promise.resolve({ name: 'Public', id: '__world__' })
      );

      fakeAuth.tokenGetter.returns(null);

      return svc.load().then(groups => {
        const publicGroupShown = groups.some(g => g.id === '__world__');
        assert.isTrue(publicGroupShown);
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
            fakeStore.setState({
              directLinkedAnnotationId: 'direct-linked-ann',
            });
          }

          // Create groups response from server.
          const groups = [{ name: 'Public', id: '__world__' }];
          if (pageHasAssociatedGroups) {
            groups.push({ name: 'BioPub', id: 'biopub' });
          }

          fakeAuth.tokenGetter.returns(loggedIn ? '1234' : null);
          fakeApi.groups.list.returns(Promise.resolve(groups));

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

        fakeApi.groups.list.returns(Promise.resolve(groups));
        fakeApi.profile.groups.read.returns(Promise.resolve([]));

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

        fakeStore.setState({ mainFrame: { uri: 'https://domain.com/page-a' } });
        return svc
          .load()
          .then(() => {
            // Simulate main frame URL change, eg. due to client-side navigation in
            // a single page application.
            fakeApi.groups.list.resetHistory();
            fakeStore.setState({
              mainFrame: { uri: 'https://domain.com/page-b' },
            });

            return fakeRootScope.eventCallbacks[events.FRAME_CONNECTED]();
          })
          .then(() => {
            assert.calledOnce(fakeApi.groups.list);
          });
      });

      it('should not refetch groups if main frame URL has not changed', () => {
        const svc = service();

        fakeStore.setState({ mainFrame: { uri: 'https://domain.com/page-a' } });
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
