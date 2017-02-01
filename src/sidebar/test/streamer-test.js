'use strict';

var EventEmitter = require('tiny-emitter');
var inherits = require('inherits');
var proxyquire = require('proxyquire');

var events = require('../events');
var unroll = require('../../shared/test/util').unroll;

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

function FakeSocket(url) {
  fakeWebSocket = this; // eslint-disable-line consistent-this

  this.url = url;
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
  var fakeAnnotationMapper;
  var fakeAnnotationUI;
  var fakeAuth;
  var fakeGroups;
  var fakeRootScope;
  var fakeSession;
  var fakeSettings;
  var activeStreamer;
  var Streamer;

  function createDefaultStreamer() {
    activeStreamer = new Streamer(
      fakeRootScope,
      fakeAnnotationMapper,
      fakeAnnotationUI,
      fakeAuth,
      fakeGroups,
      fakeSession,
      fakeSettings
    );
  }

  beforeEach(function () {
    var emitter = new EventEmitter();

    fakeAuth = {
      tokenGetter: function () {
        return Promise.resolve('dummy-access-token');
      },
    };

    fakeRootScope = {
      $apply: function (callback) {
        callback();
      },
      $on: emitter.on.bind(emitter),
      $broadcast: function (event, data) {
        emitter.emit(event, {event: event}, data);
      },
    };

    fakeAnnotationMapper = {
      loadAnnotations: sinon.stub(),
      unloadAnnotations: sinon.stub(),
    };

    fakeAnnotationUI = {
      annotationExists: sinon.stub().returns(false),
      isSidebar: sinon.stub().returns(true),
      getState: sinon.stub().returns({
        session: {
          userid: 'jim@hypothes.is',
        },
      }),
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

    return activeStreamer.connect().then(function () {
      assert.isNull(fakeWebSocket);
    });
  });

  it('should not create a websocket connection', function () {
    createDefaultStreamer();
    assert.isNull(fakeWebSocket);
  });

  it('should have a non-null client ID', function () {
    createDefaultStreamer();
    assert.ok(activeStreamer.clientId);
  });

  it('should send the client ID after connecting', function () {
    createDefaultStreamer();
    return activeStreamer.connect().then(function () {
      var clientIdMsg = fakeWebSocket.messages.find(function (msg) {
        return msg.messageType === 'client_id';
      });
      assert.ok(clientIdMsg);
      assert.equal(clientIdMsg.value, activeStreamer.clientId);
    });
  });

  it('should request the logged-in user ID after connecting', function () {
    createDefaultStreamer();
    return activeStreamer.connect().then(function () {
      var whoamiMsg = fakeWebSocket.messages.find(function (msg) {
        return msg.type === 'whoami';
      });
      assert.ok(whoamiMsg);
    });
  });

  describe('#connect()', function () {
    it('should create a websocket connection', function () {
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        assert.ok(fakeWebSocket);
      });
    });

    it('should include credentials in the URL if the client has an access token', function () {
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        assert.equal(fakeWebSocket.url, 'ws://example.com/ws?access_token=dummy-access-token');
      });
    });

    it('should preserve query params when adding access token to URL', function () {
      fakeSettings.websocketUrl = 'ws://example.com/ws?foo=bar';
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        assert.equal(fakeWebSocket.url, 'ws://example.com/ws?access_token=dummy-access-token&foo=bar');
      });
    });

    it('should not include credentials in the URL if the client has no access token', function () {
      fakeAuth.tokenGetter = function () {
        return Promise.resolve(null);
      };

      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        assert.equal(fakeWebSocket.url, 'ws://example.com/ws');
      });
    });

    it('should not close any existing socket', function () {
      var oldWebSocket;
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        oldWebSocket = fakeWebSocket;
        return activeStreamer.connect();
      }).then(function () {
        assert.ok(!oldWebSocket.didClose);
        assert.ok(!fakeWebSocket.didClose);
      });
    });
  });

  describe('#reconnect()', function () {
    it('should close the existing socket', function () {
      var oldWebSocket;
      createDefaultStreamer();

      return activeStreamer.connect().then(function () {
        oldWebSocket = fakeWebSocket;
        return activeStreamer.reconnect();
      }).then(function () {
        assert.ok(oldWebSocket.didClose);
        assert.ok(!fakeWebSocket.didClose);
      });
    });
  });

  describe('annotation notifications', function () {
    beforeEach(function () {
      createDefaultStreamer();
      return activeStreamer.connect();
    });

    context('when the app is the stream', function () {
      beforeEach(function () {
        fakeAnnotationUI.isSidebar.returns(false);
      });

      it('does not defer updates', function () {
        fakeWebSocket.notify(fixtures.createNotification);

        assert.calledWith(fakeAnnotationMapper.loadAnnotations,
          fixtures.createNotification.payload);
      });

      it('applies updates from all groups', function () {
        fakeGroups.focused.returns({id: 'private'});

        fakeWebSocket.notify(fixtures.createNotification);

        assert.calledWith(fakeAnnotationMapper.loadAnnotations,
          fixtures.createNotification.payload);
      });
    });

    context('when the app is the sidebar', function () {
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
        assert.notCalled(fakeAnnotationMapper.loadAnnotations);
      });

      it('does not apply deletions immediately', function () {
        fakeWebSocket.notify(fixtures.deleteNotification);
        assert.notCalled(fakeAnnotationMapper.unloadAnnotations);
      });
    });
  });

  describe('#applyPendingUpdates', function () {
    beforeEach(function () {
      createDefaultStreamer();
      return activeStreamer.connect();
    });

    it('applies pending updates', function () {
      fakeWebSocket.notify(fixtures.createNotification);
      activeStreamer.applyPendingUpdates();
      assert.calledWith(fakeAnnotationMapper.loadAnnotations,
        fixtures.createNotification.payload);
    });

    it('applies pending deletions', function () {
      fakeAnnotationUI.annotationExists.returns(true);

      fakeWebSocket.notify(fixtures.deleteNotification);
      activeStreamer.applyPendingUpdates();

      assert.calledWithMatch(fakeAnnotationMapper.unloadAnnotations,
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
      return activeStreamer.connect();
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
      return activeStreamer.connect().then(function () {
        fakeWebSocket.notify(fixtures.createNotification);
        fakeRootScope.$broadcast(events.GROUP_FOCUSED);

        assert.equal(activeStreamer.countPendingUpdates(), 0);
      });
    });
  });

  describe('session change notifications', function () {
    it('updates the session when a notification is received', function () {
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
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
  });

  describe('whoyouare notifications', function () {
    beforeEach(function () {
      sinon.stub(console, 'warn');
    });

    afterEach(function () {
      console.warn.restore();
    });

    unroll('does nothing if the userid matches the logged-in userid', function (testCase) {
      fakeAnnotationUI.getState.returns({
        session: {
          userid: testCase.userid,
        },
      });
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        fakeWebSocket.notify({
          type: 'whoyouare',
          userid: testCase.websocketUserid,
        });
        assert.notCalled(console.warn);
      });
    }, [{
      userid: 'acct:mr_bond@hypothes.is',
      websocketUserid: 'acct:mr_bond@hypothes.is',
    },{
      userid: null,
      websocketUserid: null,
    }]);

    unroll('logs a warning if the userid does not match the logged-in userid', function (testCase) {
      fakeAnnotationUI.getState.returns({
        session: {
          userid: testCase.userid,
        },
      });
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        fakeWebSocket.notify({
          type: 'whoyouare',
          userid: testCase.websocketUserid,
        });
        assert.called(console.warn);
      });
    }, [{
      userid: 'acct:mr_bond@hypothes.is',
      websocketUserid: 'acct:the_spanish_inquisition@hypothes.is',
    }, {
      userid: null,
      websocketUserid: 'acct:the_spanish_inquisition@hypothes.is',
    }]);
  });

  describe('reconnections', function () {
    it('resends configuration messages when a reconnection occurs', function () {
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        fakeWebSocket.messages = [];
        fakeWebSocket.emit('open');

        var configMsgTypes = fakeWebSocket.messages.map(function (msg) {
          return msg.type || msg.messageType;
        });
        assert.deepEqual(configMsgTypes, ['client_id', 'whoami']);
      });
    });
  });
});
