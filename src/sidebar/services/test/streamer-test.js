import EventEmitter from 'tiny-emitter';

import fakeReduxStore from '../../test/fake-redux-store';
import { StreamerService, $imports } from '../streamer';

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
let fakeWebSockets = [];

class FakeSocket extends EventEmitter {
  constructor(url) {
    super();

    fakeWebSocket = this; // eslint-disable-line consistent-this
    fakeWebSockets.push(this);

    this.url = url;
    this.messages = [];
    this.didClose = false;

    this.isConnected = sinon.stub().returns(true);

    this.send = function (message) {
      this.messages.push(message);
    };

    this.notify = function (message) {
      this.emit('message', { data: JSON.stringify(message) });
    };

    this.close = function () {
      this.didClose = true;
    };
  }
}

describe('StreamerService', () => {
  let fakeStore;
  let fakeAuth;
  let fakeGroups;
  let fakeSession;
  let fakeSettings;
  let fakeWarnOnce;
  let activeStreamer;

  function createDefaultStreamer() {
    activeStreamer = new StreamerService(
      fakeStore,
      fakeAuth,
      fakeGroups,
      fakeSession,
      fakeSettings
    );
  }

  beforeEach(function () {
    fakeAuth = {
      getAccessToken: sinon.stub().resolves('dummy-access-token'),
    };

    fakeStore = fakeReduxStore(
      {},
      {
        addAnnotations: sinon.stub(),
        annotationExists: sinon.stub().returns(false),
        clearPendingUpdates: sinon.stub(),
        pendingUpdates: sinon.stub().returns({}),
        pendingDeletions: sinon.stub().returns({}),
        profile: sinon.stub().returns({
          userid: 'jim@hypothes.is',
        }),
        receiveRealTimeUpdates: sinon.stub(),
        removeAnnotations: sinon.stub(),
      }
    );

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

    fakeWarnOnce = sinon.stub();

    $imports.$mock({
      '../../shared/warn-once': fakeWarnOnce,
      '../websocket': FakeSocket,
    });
  });

  afterEach(function () {
    $imports.$restore();
    activeStreamer = null;
    fakeWebSockets = [];
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
      const clientIdMsg = fakeWebSocket.messages.find(function (msg) {
        return msg.messageType === 'client_id';
      });
      assert.ok(clientIdMsg);
      assert.equal(clientIdMsg.value, activeStreamer.clientId);
    });
  });

  it('should request the logged-in user ID after connecting', function () {
    createDefaultStreamer();
    return activeStreamer.connect().then(function () {
      const whoamiMsg = fakeWebSocket.messages.find(function (msg) {
        return msg.type === 'whoami';
      });
      assert.ok(whoamiMsg);
    });
  });

  describe('#connect', function () {
    beforeEach(() => {
      sinon.stub(console, 'error');
    });

    afterEach(() => {
      console.error.restore();
    });

    it('should create a websocket connection', function () {
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        assert.ok(fakeWebSocket);
      });
    });

    it('should include credentials in the URL if the client has an access token', function () {
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        assert.equal(
          fakeWebSocket.url,
          'ws://example.com/ws?access_token=dummy-access-token'
        );
      });
    });

    it('should preserve query params when adding access token to URL', function () {
      fakeSettings.websocketUrl = 'ws://example.com/ws?foo=bar';
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        assert.equal(
          fakeWebSocket.url,
          'ws://example.com/ws?access_token=dummy-access-token&foo=bar'
        );
      });
    });

    it('should not include credentials in the URL if the client has no access token', function () {
      fakeAuth.getAccessToken.resolves(null);

      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        assert.equal(fakeWebSocket.url, 'ws://example.com/ws');
      });
    });

    it('should not close any existing socket', function () {
      let oldWebSocket;
      createDefaultStreamer();
      return activeStreamer
        .connect()
        .then(function () {
          oldWebSocket = fakeWebSocket;
          return activeStreamer.connect();
        })
        .then(function () {
          assert.ok(!oldWebSocket.didClose);
          assert.ok(!fakeWebSocket.didClose);
        });
    });

    it('throws an error if fetching the access token fails', async () => {
      fakeAuth.getAccessToken.rejects(new Error('Getting token failed'));
      createDefaultStreamer();

      const connected = activeStreamer.connect();

      await assert.rejects(connected, 'Getting token failed');
    });
  });

  describe('#reconnect()', function () {
    it('should close the existing socket', function () {
      let oldWebSocket;
      createDefaultStreamer();

      return activeStreamer
        .connect()
        .then(function () {
          oldWebSocket = fakeWebSocket;
          return activeStreamer.reconnect();
        })
        .then(function () {
          assert.ok(oldWebSocket.didClose);
          assert.ok(!fakeWebSocket.didClose);
        });
    });
  });

  describe('Automatic reconnection', function () {
    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    it('should reconnect when user changes', function () {
      let oldWebSocket;
      createDefaultStreamer();

      return activeStreamer
        .connect()
        .then(function () {
          oldWebSocket = fakeWebSocket;
          fakeStore.profile.returns({ userid: 'somebody' });
          return fakeStore.setState({});
        })
        .then(function () {
          assert.ok(oldWebSocket.didClose);
          assert.ok(!fakeWebSocket.didClose);
        });
    });

    it('should only set up auto-reconnect once', async () => {
      createDefaultStreamer();
      // This should register auto-reconnect
      await activeStreamer.connect();
      // Call connect again: this should not "re-register" auto-reconnect
      await activeStreamer.connect();

      // This should trigger auto-reconnect, but only once, proving that
      // only one registration happened
      fakeStore.profile.returns({ userid: 'somebody' });
      fakeStore.setState({});

      await delay(1);
      // Total number of web sockets blown through in this test should be 2
      // 3+ would indicate `reconnect` fired more than once
      assert.lengthOf(fakeWebSockets, 2);
    });
  });

  it('logs an error if the connection fails', () => {
    createDefaultStreamer();
    activeStreamer.connect();
    const event = new ErrorEvent('Something went wrong');

    fakeWebSocket.emit('error', event);

    assert.calledWith(
      fakeWarnOnce,
      'Error connecting to H push notification service:',
      event
    );
  });

  [null, false].forEach(message => {
    it('ignores invalid messages', () => {
      createDefaultStreamer();
      activeStreamer.connect();

      fakeWebSocket.notify(message);
    });
  });

  it('ignores messages with an unknown type', () => {
    createDefaultStreamer();
    activeStreamer.connect();

    fakeWebSocket.notify({
      type: 'unknown-event',
    });

    assert.calledWith(
      fakeWarnOnce,
      'Received unsupported notification',
      'unknown-event'
    );
  });

  describe('annotation notifications', function () {
    beforeEach(function () {
      createDefaultStreamer();
    });

    context('when the app is the stream', function () {
      beforeEach(function () {
        return activeStreamer.connect();
      });

      it('applies updates immediately', function () {
        const [ann] = fixtures.createNotification.payload;
        fakeStore.pendingUpdates.returns({
          [ann.id]: ann,
        });

        fakeWebSocket.notify(fixtures.createNotification);

        assert.calledWith(fakeStore.receiveRealTimeUpdates, {
          updatedAnnotations: [ann],
        });
        assert.calledWith(
          fakeStore.addAnnotations,
          fixtures.createNotification.payload
        );
      });
    });

    context('when the app is the sidebar', function () {
      beforeEach(function () {
        return activeStreamer.connect({ applyUpdatesImmediately: false });
      });

      it('saves pending updates', function () {
        fakeWebSocket.notify(fixtures.createNotification);
        assert.calledWith(fakeStore.receiveRealTimeUpdates, {
          updatedAnnotations: fixtures.createNotification.payload,
        });
      });

      it('saves pending deletions', function () {
        fakeWebSocket.notify(fixtures.deleteNotification);
        assert.calledWith(fakeStore.receiveRealTimeUpdates, {
          deletedAnnotations: fixtures.deleteNotification.payload,
        });
      });

      it('does not apply updates immediately', function () {
        const ann = fixtures.createNotification.payload;
        fakeStore.pendingUpdates.returns({
          [ann.id]: ann,
        });

        fakeWebSocket.notify(fixtures.createNotification);

        assert.notCalled(fakeStore.addAnnotations);
      });
    });
  });

  describe('#applyPendingUpdates', function () {
    beforeEach(function () {
      createDefaultStreamer();
      return activeStreamer.connect();
    });

    it('applies pending updates', function () {
      fakeStore.pendingUpdates.returns({ 'an-id': { id: 'an-id' } });
      activeStreamer.applyPendingUpdates();
      assert.calledWith(fakeStore.addAnnotations, [{ id: 'an-id' }]);
    });

    it('applies pending deletions', function () {
      fakeStore.pendingDeletions.returns({ 'an-id': true });

      activeStreamer.applyPendingUpdates();

      assert.calledWithMatch(
        fakeStore.removeAnnotations,
        sinon.match([{ id: 'an-id' }])
      );
    });

    it('clears the set of pending updates', function () {
      fakeWebSocket.notify(fixtures.createNotification);
      activeStreamer.applyPendingUpdates();
      assert.calledWith(fakeStore.clearPendingUpdates);
    });
  });

  describe('session change notifications', function () {
    it('updates the session when a notification is received', function () {
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
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

  describe('whoyouare notifications', function () {
    beforeEach(function () {
      sinon.stub(console, 'warn');
    });

    afterEach(function () {
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
        fakeStore.profile.returns({
          userid: testCase.userid,
        });
        createDefaultStreamer();
        return activeStreamer.connect().then(function () {
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
        fakeStore.profile.returns({
          userid: testCase.userid,
        });
        createDefaultStreamer();
        return activeStreamer.connect().then(function () {
          fakeWebSocket.notify({
            type: 'whoyouare',
            userid: testCase.websocketUserid,
          });
          assert.called(console.warn);
        });
      });
    });
  });

  describe('reconnections', function () {
    it('resends configuration messages when a reconnection occurs', function () {
      createDefaultStreamer();
      return activeStreamer.connect().then(function () {
        fakeWebSocket.messages = [];
        fakeWebSocket.emit('open');

        const configMsgTypes = fakeWebSocket.messages.map(function (msg) {
          return msg.type || msg.messageType;
        });
        assert.deepEqual(configMsgTypes, ['client_id', 'whoami']);
      });
    });
  });
});
