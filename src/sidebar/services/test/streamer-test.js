import { delay } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import { EventEmitter } from '../../../shared/event-emitter';
import { fakeReduxStore } from '../../test/fake-redux-store';
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

    this.close = () => {
      this.didClose = true;
    };
  }
}

describe('StreamerService', () => {
  let fakeAPIRoutes;
  let fakeStore;
  let fakeAuth;
  let fakeGroups;
  let fakeSession;
  let fakeWarnOnce;
  let activeStreamer;
  let fakeSetTimeout;

  function createDefaultStreamer() {
    activeStreamer = new StreamerService(
      fakeStore,
      fakeAPIRoutes,
      fakeAuth,
      fakeGroups,
      fakeSession,
      { setTimeout: fakeSetTimeout },
    );
  }

  function timeoutAsPromise() {
    const { resolve, promise } = Promise.withResolvers();
    fakeSetTimeout.callsFake(callback =>
      setTimeout(() => {
        callback();
        resolve();
      }, 0),
    );

    return promise;
  }

  beforeEach(() => {
    fakeAPIRoutes = {
      links: sinon.stub().resolves({ websocket: 'ws://example.com/ws' }),
    };

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
        highlightAnnotations: sinon.stub(),
      },
    );

    fakeGroups = {
      focused: sinon.stub().returns({ id: 'public' }),
      load: sinon.stub(),
    };

    fakeSession = {
      update: sinon.stub(),
    };

    fakeWarnOnce = sinon.stub();
    fakeSetTimeout = sinon.stub();

    $imports.$mock({
      '../../shared/warn-once': { warnOnce: fakeWarnOnce },
      '../websocket': { Socket: FakeSocket },
    });
  });

  afterEach(() => {
    $imports.$restore();
    activeStreamer = null;
    fakeWebSockets = [];
  });

  it('should not create a websocket connection if WebSocket URL is not available', () => {
    fakeAPIRoutes.links.resolves({});

    createDefaultStreamer();

    return activeStreamer.connect().then(() => {
      assert.isNull(fakeWebSocket);
    });
  });

  it('should not create a websocket connection', () => {
    createDefaultStreamer();
    assert.isNull(fakeWebSocket);
  });

  it('should have a non-null client ID', () => {
    createDefaultStreamer();
    assert.ok(activeStreamer.clientId);
  });

  it('should send the client ID after connecting', () => {
    createDefaultStreamer();
    return activeStreamer.connect().then(() => {
      const clientIdMsg = fakeWebSocket.messages.find(
        msg => msg.messageType === 'client_id',
      );
      assert.ok(clientIdMsg);
      assert.equal(clientIdMsg.value, activeStreamer.clientId);
    });
  });

  it('should request the logged-in user ID after connecting', () => {
    createDefaultStreamer();
    return activeStreamer.connect().then(() => {
      const whoamiMsg = fakeWebSocket.messages.find(
        msg => msg.type === 'whoami',
      );
      assert.ok(whoamiMsg);
    });
  });

  describe('#connect', () => {
    beforeEach(() => {
      sinon.stub(console, 'error');
    });

    afterEach(() => {
      console.error.restore();
    });

    it('should create a websocket connection', () => {
      createDefaultStreamer();
      return activeStreamer.connect().then(() => {
        assert.ok(fakeWebSocket);
      });
    });

    it('should include credentials in the URL if the client has an access token', () => {
      createDefaultStreamer();
      return activeStreamer.connect().then(() => {
        assert.equal(
          fakeWebSocket.url,
          'ws://example.com/ws?access_token=dummy-access-token',
        );
      });
    });

    it('should preserve query params when adding access token to URL', () => {
      fakeAPIRoutes.links.resolves({
        websocket: 'ws://example.com/ws?foo=bar',
      });
      createDefaultStreamer();
      return activeStreamer.connect().then(() => {
        assert.equal(
          fakeWebSocket.url,
          'ws://example.com/ws?foo=bar&access_token=dummy-access-token',
        );
      });
    });

    it('should not include credentials in the URL if the client has no access token', () => {
      fakeAuth.getAccessToken.resolves(null);

      createDefaultStreamer();
      return activeStreamer.connect().then(() => {
        assert.equal(fakeWebSocket.url, 'ws://example.com/ws');
      });
    });

    it('should not close any existing socket', () => {
      let oldWebSocket;
      createDefaultStreamer();
      return activeStreamer
        .connect()
        .then(() => {
          oldWebSocket = fakeWebSocket;
          return activeStreamer.connect();
        })
        .then(() => {
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

  describe('Automatic reconnection', () => {
    let clock;

    beforeEach(() => {
      clock = null;
      sinon.stub(console, 'error');
    });

    afterEach(() => {
      clock?.restore();
      console.error.restore();
    });

    it('should reconnect when user changes', async () => {
      createDefaultStreamer();

      await activeStreamer.connect();

      const oldWebSocket = fakeWebSocket;
      fakeStore.profile.returns({ userid: 'somebody' });
      fakeStore.setState({});

      await delay(0);

      assert.ok(oldWebSocket.didClose);
      assert.ok(!fakeWebSocket.didClose);
    });

    it('should reconnect after unexpected disconnection', async () => {
      clock = sinon.useFakeTimers();
      createDefaultStreamer();

      await activeStreamer.connect();
      fakeWebSocket.emit('disconnect');

      // Wait for reconnection to happen.
      clock.tick(3000);
      clock.restore();

      await delay(0);

      assert.lengthOf(fakeWebSockets, 2);
    });

    it('should limit number of reconnection attempts after an unexpected disconnection', async () => {
      clock = sinon.useFakeTimers();
      createDefaultStreamer();

      await activeStreamer.connect();

      for (let i = 1; i < 11; i++) {
        fakeWebSocket.emit('disconnect');

        // This mirrors the delay calculation in the service itself.
        const delay = 1000 * 2 ** i;
        clock.tick(delay);

        await Promise.resolve();
      }

      assert.lengthOf(fakeWebSockets, 10);
      assert.calledWith(
        console.error,
        'Gave up trying to reconnect to Hypothesis real time update service',
      );
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
      // Total number of web sockets created in this test should be 2
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
      event,
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
      'unknown-event',
    );
  });

  describe('annotation notifications', () => {
    beforeEach(() => {
      createDefaultStreamer();
    });

    context('when the app is the stream', () => {
      beforeEach(() => {
        return activeStreamer.connect();
      });

      it('applies updates immediately and highlights annotations', async () => {
        const timeoutPromise = timeoutAsPromise();
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
          fixtures.createNotification.payload,
        );
        assert.calledWith(
          fakeStore.highlightAnnotations,
          fixtures.createNotification.payload.map(({ id }) => id),
        );
        assert.calledWith(fakeSetTimeout, sinon.match.func, 5000);

        await timeoutPromise;
        assert.calledWith(fakeStore.highlightAnnotations, []);
      });
    });

    context('when the app is the sidebar', () => {
      beforeEach(() => {
        return activeStreamer.connect({ applyUpdatesImmediately: false });
      });

      it('saves pending updates', () => {
        fakeWebSocket.notify(fixtures.createNotification);
        assert.calledWith(fakeStore.receiveRealTimeUpdates, {
          updatedAnnotations: fixtures.createNotification.payload,
        });
      });

      it('saves pending deletions', () => {
        fakeWebSocket.notify(fixtures.deleteNotification);
        assert.calledWith(fakeStore.receiveRealTimeUpdates, {
          deletedAnnotations: fixtures.deleteNotification.payload,
        });
      });

      it('does not apply updates immediately', () => {
        const ann = fixtures.createNotification.payload;
        fakeStore.pendingUpdates.returns({
          [ann.id]: ann,
        });

        fakeWebSocket.notify(fixtures.createNotification);

        assert.notCalled(fakeStore.addAnnotations);
      });
    });
  });

  describe('#applyPendingUpdates', () => {
    beforeEach(() => {
      createDefaultStreamer();
      return activeStreamer.connect();
    });

    it('applies pending updates', () => {
      fakeStore.pendingUpdates.returns({ 'an-id': { id: 'an-id' } });
      activeStreamer.applyPendingUpdates();
      assert.calledWith(fakeStore.addAnnotations, [{ id: 'an-id' }]);
    });

    it('applies pending deletions', () => {
      fakeStore.pendingDeletions.returns({ 'an-id': true });

      activeStreamer.applyPendingUpdates();

      assert.calledWithMatch(
        fakeStore.removeAnnotations,
        sinon.match([{ id: 'an-id' }]),
      );
    });

    it('clears the set of pending updates', () => {
      fakeWebSocket.notify(fixtures.createNotification);
      activeStreamer.applyPendingUpdates();
      assert.calledWith(fakeStore.clearPendingUpdates);
    });
  });

  describe('session change notifications', () => {
    it('updates the session when a notification is received', () => {
      createDefaultStreamer();
      return activeStreamer.connect().then(() => {
        const model = {
          groups: [
            {
              id: 'new-group',
            },
          ],
        };
        fakeWebSocket.notify({
          type: 'session-change',
          model,
        });
        assert.ok(fakeSession.update.calledWith(model));
        assert.calledOnce(fakeGroups.load);
      });
    });
  });

  describe('whoyouare notifications', () => {
    beforeEach(() => {
      sinon.stub(console, 'warn');
    });

    afterEach(() => {
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
        return activeStreamer.connect().then(() => {
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
        return activeStreamer.connect().then(() => {
          fakeWebSocket.notify({
            type: 'whoyouare',
            userid: testCase.websocketUserid,
          });
          assert.called(console.warn);
        });
      });
    });
  });

  describe('reconnections', () => {
    it('resends configuration messages when a reconnection occurs', () => {
      createDefaultStreamer();
      return activeStreamer.connect().then(() => {
        fakeWebSocket.messages = [];
        fakeWebSocket.emit('open');

        const configMsgTypes = fakeWebSocket.messages.map(msg => {
          return msg.type || msg.messageType;
        });
        assert.deepEqual(configMsgTypes, ['client_id', 'whoami']);
      });
    });
  });
});
