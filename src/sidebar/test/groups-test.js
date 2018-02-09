'use strict';

var events = require('../events');
var groups = require('../groups');

// Return a mock session service containing three groups.
var sessionWithThreeGroups = function() {
  return {
    state: {
      groups: [
        {name: 'Group 1', id: 'id1'},
        {name: 'Group 2', id: 'id2'},
        {name: 'Group 3', id: 'id3'},
      ],
    },
  };
};

describe('groups', function() {
  var fakeSession;
  var fakeStore;
  var fakeLocalStorage;
  var fakeRootScope;
  var fakeServiceUrl;
  var fakeSettings;
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    fakeSession = sessionWithThreeGroups();
    fakeSettings = {
      pageGroups: ['http://h.hypothesis:5000/groups/MGkYz9j2/http-test-localhost'],
    };
    fakeLocalStorage = {
      getItem: sandbox.stub(),
      setItem: sandbox.stub(),
    };
    fakeRootScope = {
      eventCallbacks: [],

      $apply: (doStuff) => {
        if (typeof doStuff === 'function') { doStuff.call(this); }
      },
      $broadcast: sandbox.stub(),
      
      $on: function(event, callback) {
        if (event === events.GROUPS_CHANGED) {
          this.eventCallbacks.push(callback);
        }
      },
    };
    fakeStore = {
      group: {
        member: {
          delete: sandbox.stub().returns(Promise.resolve()),
        },
        read: sandbox.stub().returns(Promise.resolve({})),
      },
    };
    fakeServiceUrl = sandbox.stub();
  });

  afterEach(function () {
    sandbox.restore();
  });

  function service() {
    return groups(fakeLocalStorage, fakeServiceUrl, fakeSession,
      fakeRootScope, fakeStore, fakeSettings);
  }

  describe('.all()', function() {
    it('returns no groups if there are none in the session', function() {
      fakeSession = {state: {groups: []}};

      var groups = service().all();

      assert.equal(groups.length, 0);
    });

    it('returns the groups from the session when there are some', function() {
      var groups = service().all();

      assert.equal(groups.length, 3);
      assert.deepEqual(groups, [
        {name: 'Group 1', id: 'id1'},
        {name: 'Group 2', id: 'id2'},
        {name: 'Group 3', id: 'id3'},
      ]);
    });
  });

  describe('.get() method', function() {
    it('returns the requested group', function() {
      var group = service().get('id2');

      assert.equal(group.id, 'id2');
    });

    it("returns null if the group doesn't exist", function() {
      var group = service().get('foobar');

      assert.isNull(group);
    });
  });

  describe('.focused() method', function() {
    it('returns the focused group', function() {
      var s = service();
      s.focus('id2');

      assert.equal(s.focused().id, 'id2');
    });

    it('returns the first group initially', function() {
      var s = service();

      assert.equal(s.focused().id, 'id1');
    });

    it('returns the group selected in localStorage if available', function() {
      fakeLocalStorage.getItem.returns('id3');
      var s = service();

      assert.equal(s.focused().id, 'id3');
    });

    it('should update if the user leaves the focused group', function () {
      var s = service();
      s.focus('id2');

      var leaveGroup = function(id) {
        fakeSession.state.groups =
          fakeSession.state.groups.slice().filter(function (group) {
            return group.id !== id;
          });
        fakeRootScope.eventCallbacks.forEach(function (callback) {
          callback();
        });
      };

      leaveGroup('id3');
      assert.equal(s.focused().id, 'id2');
      leaveGroup('id2');
      assert.notEqual(s.focused().id, 'id2');
    });
  });

  describe('.focus()', function() {
    it('sets the focused group to the named group', function() {
      var s = service();
      s.focus('id2');

      assert.equal(s.focused().id, 'id2');
    });

    it('does nothing if the named group isn\'t recognised', function() {
      var s = service();
      s.focus('foobar');

      assert.equal(s.focused().id, 'id1');
    });

    it('stores the focused group id in localStorage', function() {
      var s = service();
      s.focus('id3');

      assert.calledWithMatch(fakeLocalStorage.setItem, sinon.match.any, 'id3');
    });

    it('emits the GROUP_FOCUSED event if the focused group changed', function () {
      var s = service();
      s.focus('id3');
      assert.calledWith(fakeRootScope.$broadcast, events.GROUP_FOCUSED, 'id3');
    });

    it('does not emit GROUP_FOCUSED if the focused group did not change', function () {
      var s = service();
      s.focus('id3');
      fakeRootScope.$broadcast = sinon.stub();
      s.focus('id3');
      assert.notCalled(fakeRootScope.$broadcast);
    });
  });

  describe('.leave()', function () {
    it('should call the group leave API', function () {
      var s = service();
      return s.leave('id2').then(() => {
        assert.calledWithMatch(fakeStore.group.member.delete, {
          pubid: 'id2',
          user: 'me',
        });
      });
    });
  });

  describe('.pageGroups()', function () {
    it('should fetch each group via store.group.read', function () {
      var s = service();
      return s.pageGroups().then((pageGroups) => {
        assert(Array.isArray(pageGroups), 'pageGroups() promised value is array');
        assert.equal(pageGroups.length, fakeSettings.pageGroups.length);
        assert(pageGroups.every(o => typeof o === 'object'), 'each item in promised array is an object');
        // read each url
        fakeSettings.pageGroups.forEach((groupUrl) => {
          assert.calledWith(fakeStore.group.read, groupUrl);
        });
      });
    });
  });
});
