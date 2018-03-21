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
    },{
      searchUris() {
        return this.getState().searchUris;
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
        list: sandbox.stub().returns(Promise.resolve([
          {name: 'Group 1', id: 'id1'},
          {name: 'Group 2', id: 'id2'},
          {name: 'Group 3', id: 'id3'},
        ])),
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

  describe('#all()', function() {
    it('returns no groups if there are none in the session', function() {
      fakeSession = {state: {}};

      var groups = service().all();

      assert.equal(groups.length, 0);
    });

    it('returns the groups when there are some', function() {
      var svc = service();

      return svc.load().then(() => {
        var groups = svc.all();
        assert.equal(groups.length, 3);
        assert.deepEqual(groups, [
          {name: 'Group 1', id: 'id1'},
          {name: 'Group 2', id: 'id2'},
          {name: 'Group 3', id: 'id3'},
        ]);
      });
    });
  });

  describe('#load() method', function() {
    it('loads all available groups', function() {
      var svc = service();

      return svc.load().then(() => {
        assert.equal(svc.all().length, 3);
      });
    });

    it('focuses on the first in the list of groups if user leaves the focused group', function () {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id2');
      }).then(() => {
        fakeApi.groups.list = sandbox.stub().returns(Promise.resolve([
          {name: 'Group 3', id: 'id3'},
          {name: 'Group 1', id: 'id1'},
        ]));
        return svc.load();
      }).then(() => {
        assert.equal(svc.focused().id, 'id3');
      });
    });

    context('in the sidebar', () => {
      it('waits for the document URL to be determined', () => {
        var svc = service();

        fakeStore.setState({ searchUris: [] });
        var loaded = svc.load();
        fakeStore.setState({ searchUris: ['https://asite.com'] });

        return loaded.then(() => {
          assert.calledWith(fakeApi.groups.list, { document_uri: 'https://asite.com' });
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
          assert.calledWith(fakeApi.groups.list, {});
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

  describe('#get() method', function() {
    it('returns the requested group', function() {
      var svc = service();

      return svc.load().then(() => {
        var group = svc.get('id2');
        assert.equal(group.id, 'id2');
      });
    });

    it("returns null if the group doesn't exist", function() {
      var svc = service();

      return svc.load().then(() => {
        var group = svc.get('foobar');
        assert.isNull(group);
      });
    });
  });

  describe('#focused() method', function() {
    it('returns the focused group', function() {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id2');
        assert.equal(svc.focused().id, 'id2');
      });
    });

    it('returns the first group initially', function() {
      var svc = service();

      return svc.load().then(() => {
        assert.equal(svc.focused().id, 'id1');
      });
    });

    it('returns the group selected in localStorage if available', function() {
      fakeLocalStorage.getItem.returns('id3');
      var svc = service();

      return svc.load().then(() => {
        assert.equal(svc.focused().id, 'id3');
      });
    });
  });

  describe('#focus()', function() {
    it('sets the focused group to the named group', function() {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id2');

        assert.equal(svc.focused().id, 'id2');
      });
    });

    it('does nothing if the named group isn\'t recognised', function() {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('foobar');

        assert.equal(svc.focused().id, 'id1');
      });
    });

    it('stores the focused group id in localStorage', function() {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id3');

        assert.calledWithMatch(fakeLocalStorage.setItem, sinon.match.any, 'id3');
      });
    });

    it('emits the GROUP_FOCUSED event if the focused group changed', function () {
      var svc = service();

      return svc.load().then(() => {
        svc.focus('id3');
        assert.calledWith(fakeRootScope.$broadcast, events.GROUP_FOCUSED, 'id3');
      });
    });

    it('does not emit GROUP_FOCUSED if the focused group did not change', function () {
      var svc = service();
      return svc.load().then(() => {
        svc.focus('id3');
        fakeRootScope.$broadcast = sinon.stub();
        svc.focus('id3');
        assert.notCalled(fakeRootScope.$broadcast);
      });
    });
  });

  describe('#leave()', function () {
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
