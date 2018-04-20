'use strict';

var events = require('../../events');
var fakeReduxStore = require('../../test/fake-redux-store');
var groups = require('../groups');
var unroll = require('../../../shared/test/util').unroll;

// Return a mock session service containing three groups.
var sessionWithThreeGroups = function() {
  return {
    state: {},
  };
};

var dummyGroups = [
  { name: 'Group 1', id: 'id1'},
  { name: 'Group 2', id: 'id2'},
  { name: 'Group 3', id: 'id3'},
];

describe('groups', function() {
  var fakeStore;
  var fakeIsSidebar;
  var fakeSession;
  var fakeSettings;
  var fakeApi;
  var fakeLocalStorage;
  var fakeRootScope;
  var fakeServiceUrl;
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    fakeStore = fakeReduxStore({
      searchUris: ['http://example.org'],
      focusedGroup: null,
      groups: [],
    },{
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
        var group = this.getState().focusedGroup;
        return group ? group.id : null;
      },
    });
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
        if (event === events.GROUPS_CHANGED || event === events.USER_CHANGED || event === events.FRAME_CONNECTED) {
          this.eventCallbacks[event] = callback;
        }
      },

      $broadcast: sandbox.stub(),
    };
    fakeApi = {
      group: {
        member: {
          delete: sandbox.stub().returns(Promise.resolve()),
        },
      },
      groups: {
        list: sandbox.stub().returns(Promise.resolve(dummyGroups)),
      },
    };
    fakeServiceUrl = sandbox.stub();
    fakeSettings = {};
  });

  afterEach(function () {
    sandbox.restore();
  });

  function service() {
    return groups(fakeRootScope, fakeStore, fakeApi, fakeIsSidebar, fakeLocalStorage, fakeServiceUrl,
      fakeSession, fakeSettings);
  }

  describe('#all', function() {
    it('returns all groups', function() {
      var svc = service();
      fakeStore.setState({ groups: dummyGroups });
      assert.deepEqual(svc.all(), dummyGroups);
    });
  });

  describe('#load', function() {
    it('loads all available groups', function() {
      var svc = service();

      return svc.load().then(() => {
        assert.calledWith(fakeStore.loadGroups, dummyGroups);
      });
    });

    it('always sends the `expand` parameter', function () {
      const svc = service();
      return svc.load().then(() => {
        const call = fakeApi.groups.list.getCall(0);
        assert.isObject(call.args[0]);
        assert.equal(call.args[0].expand, 'organization');
      });
    });

    it('sets the focused group from the value saved in local storage', () => {
      var svc  = service();
      fakeLocalStorage.getItem.returns(dummyGroups[1].id);
      return svc.load().then(() => {
        assert.calledWith(fakeStore.focusGroup, dummyGroups[1].id);
      });
    });

    context('in the sidebar', () => {
      it('waits for the document URL to be determined', () => {
        var svc = service();

        fakeStore.setState({ searchUris: [] });
        var loaded = svc.load();
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
        var svc = service();
        return svc.load().then(() => {
          assert.calledWith(fakeApi.groups.list, {
            expand: 'organization',
          });
        });
      });
    });

    it('passes authority argument when using a third-party authority', () => {
      fakeSettings.services = [{ authority: 'publisher.org' }];
      var svc = service();
      return svc.load().then(() => {
        assert.calledWith(fakeApi.groups.list, sinon.match({ authority: 'publisher.org' }));
      });
    });
  });

  describe('#get', function() {
    it('returns the requested group', function() {
      var svc = service();
      fakeStore.getGroup.withArgs('foo').returns(dummyGroups[1]);

      assert.equal(svc.get('foo'), dummyGroups[1]);
    });
  });

  describe('#focused', function() {
    it('returns the focused group', function() {
      var svc = service();
      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[2] });
      assert.equal(svc.focused(), dummyGroups[2]);
    });
  });

  describe('#focus', function() {
    it('sets the focused group to the named group', function() {
      var svc = service();
      svc.focus('foo');
      assert.calledWith(fakeStore.focusGroup, 'foo');
    });
  });

  context('when the focused group changes', () => {
    it('stores the focused group id in localStorage', function() {
      service();

      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[1] });

      assert.calledWithMatch(fakeLocalStorage.setItem, sinon.match.any, dummyGroups[1].id);
    });

    it('emits the GROUP_FOCUSED event if the focused group changed', function () {
      service();

      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[1] });

      assert.calledWith(fakeRootScope.$broadcast, events.GROUP_FOCUSED, dummyGroups[1].id);
    });

    it('does not emit GROUP_FOCUSED if the focused group did not change', () => {
      service();

      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[1] });
      fakeRootScope.$broadcast.reset();
      fakeStore.setState({ groups: dummyGroups, focusedGroup: dummyGroups[1] });

      assert.notCalled(fakeRootScope.$broadcast);
    });
  });

  describe('#leave', function () {
    it('should call the group leave API', function () {
      var s = service();
      return s.leave('id2').then(() => {
        assert.calledWithMatch(fakeApi.group.member.delete, {
          pubid: 'id2',
          user: 'me',
        });
      });
    });
  });

  describe('calls load on various events', function () {
    var changeEvents = [
      {event: events.GROUPS_CHANGED},
      {event: events.USER_CHANGED},
      {event: events.FRAME_CONNECTED},
    ];

    unroll('should fetch the list of groups from the server when #event occurs', function (testCase) {
      service();

      return fakeRootScope.eventCallbacks[testCase.event]().then(() => {
        assert.calledOnce(fakeApi.groups.list);
      });
    }, changeEvents);
  });
});
