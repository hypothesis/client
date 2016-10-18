'use strict';

var EventEmitter = require('tiny-emitter');
var inherits = require('inherits');
var proxyquire = require('proxyquire');

var events = require('../events');
var unroll = require('./util').unroll;

var fixtures = {
  createNotification: {
    type: 'annotation-notification',
    options: {
      action: 'create',
    },
    payload: [{
      id: 'an-id',
      group: 'public',
    }],
  },
  updateNotification: {
    type: 'annotation-notification',
    options: {
      action: 'create',
    },
    payload: [{
      id: 'an-id',
      group: 'public',
    }],
  },
  deleteNotification: {
    type: 'annotation-notification',
    options: {
      action: 'delete',
    },
    payload: [{
      id: 'an-id',
    }],
  },
};

// the most recently created FakeSocket instance
var fakeWebSocket = null;

function FakeSocket() {
  fakeWebSocket = this; // eslint-disable-line consistent-this

  this.messages = [];
  this.didClose = false;

  this.isConnected = sinon.stub().returns(true);

  this.send = function (message) {
    this.messages.push(message);
  };

  this.notify = function (message) {
    this.emit('message', {data: JSON.stringify(message)});
  };

  this.close = function () {
    this.didClose = true;
  };
}
inherits(FakeSocket, EventEmitter);

describe('Streamer', function () {
  var fakeAnnotationUI;
  var fakeFeatures;
  var fakeGroups;
  var fakeRootScope;
  var fakeSession;
  var fakeSettings;
  var activeStreamer;
  var Streamer;

  function createDefaultStreamer() {
    activeStreamer = new Streamer(
      fakeRootScope,
      fakeAnnotationUI,
      fakeFeatures,
      fakeGroups,
      fakeSession,
      fakeSettings
    );
  }

  beforeEach(function () {
    var emitter = new EventEmitter();

    fakeRootScope = {
      $apply: function (callback) {
        callback();
      },
      $on: emitter.on.bind(emitter),
      $broadcast: function (event, data) {
        emitter.emit(event, {event: event}, data);
      },
    };

    fakeAnnotationUI = {
      addAnnotations: sinon.stub(),
      removeAnnotations: sinon.stub(),
      annotationExists: sinon.stub().returns(false),
      isSidebar: sinon.stub().returns(true),
    };

    fakeFeatures = {
      flagEnabled: sinon.stub().returns(false),
    };

    fakeGroups = {
      focused: sinon.stub().returns({id: 'public'}),
    };

    fakeSession = {
      update: sinon.stub(),
    };

    fakeSettings = {
      websocketUrl: 'ws://example.com/ws',
    };

    Streamer = proxyquire('../streamer', {
      './websocket': FakeSocket,
    });
  });

  afterEach(function () {
    activeStreamer = null;
  });

  it('should not create a websocket connection if websocketUrl is not provided', function () {
    fakeSettings = {};
    createDefaultStreamer();
    activeStreamer.connect();
    assert.isNull(fakeWebSocket);
  });

  it('should not create a websocket connection', function () {
    createDefaultStreamer();
    assert.isNull(fakeWebSocket);
  });

  it('should have a non-null client ID', function () {
    createDefaultStreamer();
    assert.ok(activeStreamer.clientId);
  });

  it('should send the client ID on connection', function () {
    createDefaultStreamer();
    activeStreamer.connect();
    assert.equal(fakeWebSocket.messages.length, 1);
    assert.equal(fakeWebSocket.messages[0].messageType, 'client_id');
    assert.equal(fakeWebSocket.messages[0].value, activeStreamer.clientId);
  });

  describe('#connect()', function () {
    it('should create a websocket connection', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      assert.ok(fakeWebSocket);
    });

    it('should not close any existing socket', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      var oldWebSocket = fakeWebSocket;
      activeStreamer.connect();
      assert.ok(!oldWebSocket.didClose);
      assert.ok(!fakeWebSocket.didClose);
    });
  });

  describe('#reconnect()', function () {
    it('should close the existing socket', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      var oldWebSocket = fakeWebSocket;
      activeStreamer.reconnect();
      assert.ok(oldWebSocket.didClose);
      assert.ok(!fakeWebSocket.didClose);
    });
  });

  describe('annotation notifications', function () {
    beforeEach(function () {
      createDefaultStreamer();
      activeStreamer.connect();
    });

    context('when realtime updates are not deferred', function () {
      it('should load new annotations', function () {
        fakeWebSocket.notify(fixtures.createNotification);
        assert.calledOnce(fakeAnnotationUI.addAnnotations);
      });

      it('should unload deleted annotations', function () {
        fakeAnnotationUI.annotationExists.returns(true);
        fakeWebSocket.notify(fixtures.deleteNotification);
        assert.calledOnce(fakeAnnotationUI.removeAnnotations);
      });

      it('ignores notifications about annotations in unfocused groups', function () {
        fakeGroups.focused.returns({id: 'private'});
        fakeWebSocket.notify(fixtures.createNotification);
        assert.notCalled(fakeAnnotationUI.addAnnotations);
      });
    });

    context('when the app is the stream', function () {
      beforeEach(function () {
        // Enable the `defer_realtime_updates` feature flag
        fakeFeatures.flagEnabled.returns(true);
        fakeAnnotationUI.isSidebar.returns(false);
      });

      it('does not defer updates', function () {
        fakeWebSocket.notify(fixtures.createNotification);

        assert.calledWith(fakeAnnotationUI.addAnnotations,
          fixtures.createNotification.payload);
      });

      it('applies updates from all groups', function () {
        fakeGroups.focused.returns({id: 'private'});

        fakeWebSocket.notify(fixtures.createNotification);

        assert.calledWith(fakeAnnotationUI.addAnnotations,
          fixtures.createNotification.payload);
      });
    });

    context('when realtime updates are deferred', function () {
      beforeEach(function () {
        fakeFeatures.flagEnabled.returns(true);
      });

      it('saves pending updates', function () {
        fakeWebSocket.notify(fixtures.createNotification);
        assert.equal(activeStreamer.countPendingUpdates(), 1);
      });

      it('does not save pending updates for annotations in unfocused groups', function () {
        fakeGroups.focused.returns({id: 'private'});
        fakeWebSocket.notify(fixtures.createNotification);
        assert.equal(activeStreamer.countPendingUpdates(), 0);
      });

      it('saves pending deletions if the annotation is loaded', function () {
        var id = fixtures.deleteNotification.payload[0].id;
        fakeAnnotationUI.annotationExists.returns(true);

        fakeWebSocket.notify(fixtures.deleteNotification);

        assert.isTrue(activeStreamer.hasPendingDeletion(id));
        assert.equal(activeStreamer.countPendingUpdates(), 1);
      });

      it('discards pending deletions if the annotation is not loaded', function () {
        var id = fixtures.deleteNotification.payload[0].id;
        fakeAnnotationUI.annotationExists.returns(false);

        fakeWebSocket.notify(fixtures.deleteNotification);

        assert.isFalse(activeStreamer.hasPendingDeletion(id));
      });

      it('saves one pending update per annotation', function () {
        fakeWebSocket.notify(fixtures.createNotification);
        fakeWebSocket.notify(fixtures.updateNotification);
        assert.equal(activeStreamer.countPendingUpdates(), 1);
      });

      it('discards pending updates if an unloaded annotation is deleted', function () {
        fakeAnnotationUI.annotationExists.returns(false);

        fakeWebSocket.notify(fixtures.createNotification);
        fakeWebSocket.notify(fixtures.deleteNotification);

        assert.equal(activeStreamer.countPendingUpdates(), 0);
      });

      it('does not apply updates immediately', function () {
        fakeWebSocket.notify(fixtures.createNotification);
        assert.notCalled(fakeAnnotationUI.addAnnotations);
      });

      it('does not apply deletions immediately', function () {
        fakeWebSocket.notify(fixtures.deleteNotification);
        assert.notCalled(fakeAnnotationUI.removeAnnotations);
      });
    });
  });

  describe('#applyPendingUpdates', function () {
    beforeEach(function () {
      createDefaultStreamer();
      activeStreamer.connect();
      fakeFeatures.flagEnabled.returns(true);
    });

    it('applies pending updates', function () {
      fakeWebSocket.notify(fixtures.createNotification);
      activeStreamer.applyPendingUpdates();
      assert.calledWith(fakeAnnotationUI.addAnnotations,
        fixtures.createNotification.payload);
    });

    it('applies pending deletions', function () {
      fakeAnnotationUI.annotationExists.returns(true);

      fakeWebSocket.notify(fixtures.deleteNotification);
      activeStreamer.applyPendingUpdates();

      assert.calledWithMatch(fakeAnnotationUI.removeAnnotations,
        sinon.match([{id: 'an-id'}]));
    });

    it('clears the set of pending updates', function () {
      fakeWebSocket.notify(fixtures.createNotification);
      activeStreamer.applyPendingUpdates();
      assert.equal(activeStreamer.countPendingUpdates(), 0);
    });
  });

  describe('when annotations are unloaded, updated or deleted', function () {
    var changeEvents = [
      {event: events.ANNOTATION_DELETED},
      {event: events.ANNOTATION_UPDATED},
      {event: events.ANNOTATIONS_UNLOADED},
    ];

    beforeEach(function () {
      createDefaultStreamer();
      activeStreamer.connect();
      fakeFeatures.flagEnabled.returns(true);
    });

    unroll('discards pending updates when #event occurs', function (testCase) {
      fakeWebSocket.notify(fixtures.createNotification);
      assert.equal(activeStreamer.countPendingUpdates(), 1);
      fakeRootScope.$broadcast(testCase.event, {id: 'an-id'});
      assert.equal(activeStreamer.countPendingUpdates(), 0);
    }, changeEvents);

    unroll('discards pending deletions when #event occurs', function (testCase) {
      fakeAnnotationUI.annotationExists.returns(true);
      fakeWebSocket.notify(fixtures.deleteNotification);

      fakeRootScope.$broadcast(testCase.event, {id: 'an-id'});

      assert.isFalse(activeStreamer.hasPendingDeletion('an-id'));
    }, changeEvents);
  });

  describe('when the focused group changes', function () {
    it('clears pending updates and deletions', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      fakeFeatures.flagEnabled.returns(true);

      fakeWebSocket.notify(fixtures.createNotification);
      fakeRootScope.$broadcast(events.GROUP_FOCUSED);

      assert.equal(activeStreamer.countPendingUpdates(), 0);
    });
  });

  describe('session change notifications', function () {
    it('updates the session when a notification is received', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      var model = {
        groups: [{
          id: 'new-group',
        }],
      };
      fakeWebSocket.notify({
        type: 'session-change',
        model: model,
      });
      assert.ok(fakeSession.update.calledWith(model));
    });
  });

  describe('reconnections', function () {
    it('resends configuration messages when a reconnection occurs', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      fakeWebSocket.messages = [];
      fakeWebSocket.emit('open');
      assert.equal(fakeWebSocket.messages.length, 1);
      assert.equal(fakeWebSocket.messages[0].messageType, 'client_id');
    });
  });
});
