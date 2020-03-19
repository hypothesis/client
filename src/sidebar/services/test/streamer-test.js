import EventEmitter from 'tiny-emitter';

import Streamer from '../streamer';
import { $imports } from '../streamer';

const fixtures = {
  createNotification: {
    type: 'annotation-notification',
    options: {
      action: 'create',
    },
    payload: [
      {
        id: 'an-id',
        group: 'public',
      },
    ],
  },
  updateNotification: {
    type: 'annotation-notification',
    options: {
      action: 'create',
    },
    payload: [
      {
        id: 'an-id',
        group: 'public',
      },
    ],
  },
  deleteNotification: {
    type: 'annotation-notification',
    options: {
      action: 'delete',
    },
    payload: [
      {
        id: 'an-id',
      },
    ],
  },
};

// the most recently created FakeSocket instance
let fakeWebSocket = null;

class FakeSocket extends EventEmitter {
  constructor(url) {
    super();

    fakeWebSocket = this; // eslint-disable-line consistent-this

    this.url = url;
    this.messages = [];
    this.didClose = false;

    this.isConnected = sinon.stub().returns(true);

    this.send = function(message) {
      this.messages.push(message);
    };

    this.notify = function(message) {
      this.emit('message', { data: JSON.stringify(message) });
    };

    this.close = function() {
      this.didClose = true;
    };
  }
}

describe('Streamer', function() {
  let fakeAnnotationMapper;
  let fakeStore;
  let fakeAuth;
  let fakeGroups;
  let fakeRootScope;
  let fakeSession;
  let fakeSettings;
  let activeStreamer;

  function createDefaultStreamer() {
    activeStreamer = new Streamer(
      fakeRootScope,
      fakeAnnotationMapper,
      fakeStore,
      fakeAuth,
      fakeGroups,
      fakeSession,
      fakeSettings
    );
  }

  beforeEach(function() {
    const emitter = new EventEmitter();

    fakeAuth = {
      tokenGetter: function() {
        return Promise.resolve('dummy-access-token');
      },
    };

    fakeRootScope = {
      $apply: function(callback) {
        callback();
      },
      $on: emitter.on.bind(emitter),
      $broadcast: function(event, data) {
        emitter.emit(event, { event: event }, data);
      },
    };

    fakeAnnotationMapper = {
      loadAnnotations: sinon.stub(),
    };

    fakeStore = {
      annotationExists: sinon.stub().returns(false),
      clearPendingUpdates: sinon.stub(),
      getState: sinon.stub().returns({
        session: {
          userid: 'jim@hypothes.is',
        },
      }),
      pendingUpdates: sinon.stub().returns({}),
      pendingDeletions: sinon.stub().returns({}),
      receiveRealTimeUpdates: sinon.stub(),
      removeAnnotations: sinon.stub(),
      route: sinon.stub().returns('sidebar'),
    };

    fakeGroups = {
      focused: sinon.stub().returns({ id: 'public' }),
      load: sinon.stub(),
    };

    fakeSession = {
      update: sinon.stub(),
    };

    fakeSettings = {
      websocketUrl: 'ws://example.com/ws',
    };

    $imports.$mock({
      '../websocket': FakeSocket,
    });
  });

  afterEach(function() {
    $imports.$restore();
    activeStreamer = null;
  });

  it('should not create a websocket connection if websocketUrl is not provided', function() {
    fakeSettings = {};
    createDefaultStreamer();

    return activeStreamer.connect().then(function() {
      assert.isNull(fakeWebSocket);
    });
  });

  it('should not create a websocket connection', function() {
    createDefaultStreamer();
    assert.isNull(fakeWebSocket);
  });

  it('should have a non-null client ID', function() {
    createDefaultStreamer();
    assert.ok(activeStreamer.clientId);
  });

  it('should send the client ID after connecting', function() {
    createDefaultStreamer();
    return activeStreamer.connect().then(function() {
      const clientIdMsg = fakeWebSocket.messages.find(function(msg) {
        return msg.messageType === 'client_id';
      });
      assert.ok(clientIdMsg);
      assert.equal(clientIdMsg.value, activeStreamer.clientId);
    });
  });

  it('should request the logged-in user ID after connecting', function() {
    createDefaultStreamer();
    return activeStreamer.connect().then(function() {
      const whoamiMsg = fakeWebSocket.messages.find(function(msg) {
        return msg.type === 'whoami';
      });
      assert.ok(whoamiMsg);
    });
  });

  describe('#connect()', function() {
    it('should create a websocket connection', function() {
      createDefaultStreamer();
      return activeStreamer.connect().then(function() {
        assert.ok(fakeWebSocket);
      });
    });

    it('should include credentials in the URL if the client has an access token', function() {
      createDefaultStreamer();
      return activeStreamer.connect().then(function() {
        assert.equal(
          fakeWebSocket.url,
          'ws://example.com/ws?access_token=dummy-access-token'
        );
      });
    });

    it('should preserve query params when adding access token to URL', function() {
      fakeSettings.websocketUrl = 'ws://example.com/ws?foo=bar';
      createDefaultStreamer();
      return activeStreamer.connect().then(function() {
        assert.equal(
          fakeWebSocket.url,
          'ws://example.com/ws?access_token=dummy-access-token&foo=bar'
        );
      });
    });

    it('should not include credentials in the URL if the client has no access token', function() {
      fakeAuth.tokenGetter = function() {
        return Promise.resolve(null);
      };

      createDefaultStreamer();
      return activeStreamer.connect().then(function() {
        assert.equal(fakeWebSocket.url, 'ws://example.com/ws');
      });
    });

    it('should not close any existing socket', function() {
      let oldWebSocket;
      createDefaultStreamer();
      return activeStreamer
        .connect()
        .then(function() {
          oldWebSocket = fakeWebSocket;
          return activeStreamer.connect();
        })
        .then(function() {
          assert.ok(!oldWebSocket.didClose);
          assert.ok(!fakeWebSocket.didClose);
        });
    });
  });

  describe('#reconnect()', function() {
    it('should close the existing socket', function() {
      let oldWebSocket;
      createDefaultStreamer();

      return activeStreamer
        .connect()
        .then(function() {
          oldWebSocket = fakeWebSocket;
          return activeStreamer.reconnect();
        })
        .then(function() {
          assert.ok(oldWebSocket.didClose);
          assert.ok(!fakeWebSocket.didClose);
        });
    });
  });

  describe('annotation notifications', function() {
    beforeEach(function() {
      createDefaultStreamer();
      return activeStreamer.connect();
    });

    context('when the app is the stream', function() {
      beforeEach(function() {
        fakeStore.route.returns('stream');
      });

      it('applies updates immediately', function() {
        const [ann] = fixtures.createNotification.payload;
        fakeStore.pendingUpdates.returns({
          [ann.id]: ann,
        });

        fakeWebSocket.notify(fixtures.createNotification);

        assert.calledWith(fakeStore.receiveRealTimeUpdates, {
          updatedAnnotations: [ann],
        });
        assert.calledWith(
          fakeAnnotationMapper.loadAnnotations,
          fixtures.createNotification.payload
        );
      });
    });

    context('when the app is the sidebar', function() {
      it('saves pending updates', function() {
        fakeWebSocket.notify(fixtures.createNotification);
        assert.calledWith(fakeStore.receiveRealTimeUpdates, {
          updatedAnnotations: fixtures.createNotification.payload,
        });
      });

      it('saves pending deletions', function() {
        fakeWebSocket.notify(fixtures.deleteNotification);
        assert.calledWith(fakeStore.receiveRealTimeUpdates, {
          deletedAnnotations: fixtures.deleteNotification.payload,
        });
      });

      it('does not apply updates immediately', function() {
        const ann = fixtures.createNotification.payload;
        fakeStore.pendingUpdates.returns({
          [ann.id]: ann,
        });

        fakeWebSocket.notify(fixtures.createNotification);

        assert.notCalled(fakeAnnotationMapper.loadAnnotations);
      });

      it('does not apply deletions immediately', function() {
        const ann = fixtures.deleteNotification.payload;
        fakeStore.pendingDeletions.returns({
          [ann.id]: true,
        });

        fakeWebSocket.notify(fixtures.deleteNotification);

        assert.notCalled(fakeStore.removeAnnotations);
      });
    });
  });

  describe('#applyPendingUpdates', function() {
    beforeEach(function() {
      createDefaultStreamer();
      return activeStreamer.connect();
    });

    it('applies pending updates', function() {
      fakeStore.pendingUpdates.returns({ 'an-id': { id: 'an-id' } });
      activeStreamer.applyPendingUpdates();
      assert.calledWith(fakeAnnotationMapper.loadAnnotations, [
        { id: 'an-id' },
      ]);
    });

    it('applies pending deletions', function() {
      fakeStore.pendingDeletions.returns({ 'an-id': true });

      activeStreamer.applyPendingUpdates();

      assert.calledWithMatch(
        fakeStore.removeAnnotations,
        sinon.match([{ id: 'an-id' }])
      );
    });

    it('clears the set of pending updates', function() {
      fakeWebSocket.notify(fixtures.createNotification);
      activeStreamer.applyPendingUpdates();
      assert.calledWith(fakeStore.clearPendingUpdates);
    });
  });

  describe('session change notifications', function() {
    it('updates the session when a notification is received', function() {
      createDefaultStreamer();
      return activeStreamer.connect().then(function() {
        const model = {
          groups: [
            {
              id: 'new-group',
            },
          ],
        };
        fakeWebSocket.notify({
          type: 'session-change',
          model: model,
        });
        assert.ok(fakeSession.update.calledWith(model));
        assert.calledOnce(fakeGroups.load);
      });
    });
  });

  describe('whoyouare notifications', function() {
    beforeEach(function() {
      sinon.stub(console, 'warn');
    });

    afterEach(function() {
      console.warn.restore();
    });

    [
      {
        userid: 'acct:mr_bond@hypothes.is',
        websocketUserid: 'acct:mr_bond@hypothes.is',
      },
      {
        userid: null,
        websocketUserid: null,
      },
    ].forEach(testCase => {
      it('does nothing if the userid matches the logged-in userid', () => {
        fakeStore.getState.returns({
          session: {
            userid: testCase.userid,
          },
        });
        createDefaultStreamer();
        return activeStreamer.connect().then(function() {
          fakeWebSocket.notify({
            type: 'whoyouare',
            userid: testCase.websocketUserid,
          });
          assert.notCalled(console.warn);
        });
      });
    });

    [
      {
        userid: 'acct:mr_bond@hypothes.is',
        websocketUserid: 'acct:the_spanish_inquisition@hypothes.is',
      },
      {
        userid: null,
        websocketUserid: 'acct:the_spanish_inquisition@hypothes.is',
      },
    ].forEach(testCase => {
      it('logs a warning if the userid does not match the logged-in userid', () => {
        fakeStore.getState.returns({
          session: {
            userid: testCase.userid,
          },
        });
        createDefaultStreamer();
        return activeStreamer.connect().then(function() {
          fakeWebSocket.notify({
            type: 'whoyouare',
            userid: testCase.websocketUserid,
          });
          assert.called(console.warn);
        });
      });
    });
  });

  describe('reconnections', function() {
    it('resends configuration messages when a reconnection occurs', function() {
      createDefaultStreamer();
      return activeStreamer.connect().then(function() {
        fakeWebSocket.messages = [];
        fakeWebSocket.emit('open');

        const configMsgTypes = fakeWebSocket.messages.map(function(msg) {
          return msg.type || msg.messageType;
        });
        assert.deepEqual(configMsgTypes, ['client_id', 'whoami']);
      });
    });
  });
});
