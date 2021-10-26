import { awaitEvent } from '../../test-util/wait';
import {
  Socket,
  CLOSE_NORMAL,
  CLOSE_GOING_AWAY,
  CLOSE_ABNORMAL,
  RECONNECT_MIN_DELAY,
} from '../websocket';

describe('Socket (WebSocket wrapper)', () => {
  // Current fake WebSocket instance
  let fakeSocket;
  let clock;

  // How many WebSocket instances have been created in total in this test
  let connectionCount;

  // Should the initial connection attempt succeed?
  let autoConnect;

  class FakeWebSocket {
    constructor(url) {
      ++connectionCount;

      this.close = sinon.stub();
      this.readyState = WebSocket.CONNECTING;
      this.send = sinon.stub();
      this.url = url;

      fakeSocket = this; // eslint-disable-line consistent-this

      // Simulate initial connection completing on the next tick after the
      // WebSocket is constructed.
      if (autoConnect) {
        queueMicrotask(() => this.simulateOpen());
      }
    }

    simulateOpen() {
      this.readyState = WebSocket.OPEN;
      this.onopen({});
    }

    simulateClose(code) {
      this.readyState = WebSocket.CLOSED;
      this.onclose({ code });
    }

    simulateMessage(data) {
      const event = new MessageEvent('message', { data });
      this.onmessage(event);
    }

    simulateError(message) {
      this.onerror(new ErrorEvent('error', { message }));
    }
  }

  // Copy the `readyState` enum values from the real WebSocket object to the
  // fake, so they can still be used when the fake is active.
  Object.keys(WebSocket).forEach(prop => {
    if (prop.match(/[A-Z]+/)) {
      FakeWebSocket[prop] = WebSocket[prop];
    }
  });

  const OriginalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    globalThis.WebSocket = FakeWebSocket;
    clock = sinon.useFakeTimers();
    connectionCount = 0;
    autoConnect = true;

    // Suppress warnings of WebSocket issues in tests for handling
    // of abnormal disconnections
    sinon.stub(console, 'warn');
    sinon.stub(console, 'error');
  });

  afterEach(() => {
    globalThis.WebSocket = OriginalWebSocket;
    clock.restore();
    console.warn.restore();
    console.error.restore();
  });

  context('when the connection is closed by the browser or server', () => {
    it('should reconnect after an abnormal disconnection', async () => {
      const socket = new Socket(() => 'ws://test:1234');
      await awaitEvent(socket, 'open');

      const initialSocket = fakeSocket;
      fakeSocket.simulateClose(CLOSE_ABNORMAL);
      clock.tick(2000);

      await awaitEvent(socket, 'open');
      assert.notEqual(fakeSocket, initialSocket);
    });

    it('should fetch a new URL for each reconnection attempt', async () => {
      // `getURL` may be sync or async. This test uses an async function to
      // better simulate the real application.
      let counter = 0;
      const getURL = async () => {
        ++counter;
        return `ws://test:1234?access_token=token${counter}`;
      };

      const socket = new Socket(getURL);
      await awaitEvent(socket, 'open');
      assert.equal(fakeSocket.url, 'ws://test:1234?access_token=token1');

      fakeSocket.simulateClose(CLOSE_ABNORMAL);
      clock.tick(2000);

      await awaitEvent(socket, 'open');
      assert.equal(fakeSocket.url, 'ws://test:1234?access_token=token2');
    });

    it('should send queued messages after a reconnect', async () => {
      const socket = new Socket(() => 'ws://test:1234');
      await awaitEvent(socket, 'open');

      // Close the connection, then enqueue a message before it has had a
      // chance to reconnect, and check that the message is re-sent after
      // the WS reconnects.
      fakeSocket.simulateClose(CLOSE_ABNORMAL);
      socket.send({ aKey: 'aValue' });
      clock.tick(2000);

      await awaitEvent(socket, 'open');
      assert.calledWith(fakeSocket.send, '{"aKey":"aValue"}');
    });

    [CLOSE_NORMAL, CLOSE_GOING_AWAY].forEach(closeCode => {
      it('should not reconnect after a normal disconnection', async () => {
        const socket = new Socket(() => 'ws://test:1234');
        await awaitEvent(socket, 'open');

        assert.ok(fakeSocket);
        const initialSocket = fakeSocket;

        fakeSocket.simulateClose(closeCode);
        clock.tick(4000);

        await Promise.resolve(); // Wait a tick for the reconnection to complete.
        assert.equal(fakeSocket, initialSocket);
      });
    });

    it('should stop trying to reconnect after 10 retries', async () => {
      autoConnect = false;
      new Socket(() => 'ws://test:1234');
      await Promise.resolve(); // Wait a tick for initial attempt to complete

      for (let attempt = 1; attempt <= 11; attempt++) {
        fakeSocket.simulateClose(CLOSE_ABNORMAL);

        // The delay between retries is a random value between `minTimeout` and
        // `minTimeout * (backoffFactor ** attempt)`. See docs for "retry" package.
        const minTimeout = RECONNECT_MIN_DELAY;
        const backoffFactor = 2; // Default exponential factor for "retry" package
        const maxDelay = minTimeout * Math.pow(backoffFactor, attempt);
        clock.tick(maxDelay);

        await Promise.resolve(); // Wait a tick for reconnection to complete.
      }

      assert.equal(connectionCount, 10);
      assert.calledWith(
        console.error,
        'Reached max retries attempting to reconnect WebSocket'
      );
    });
  });

  it('should queue messages sent prior to connection', async () => {
    const socket = new Socket(() => 'ws://test:1234');
    socket.send({ abc: 'foo' });
    assert.notOk(fakeSocket);

    await awaitEvent(socket, 'open');
    assert.calledWith(fakeSocket.send, '{"abc":"foo"}');
  });

  it('should send messages immediately when connected', async () => {
    const socket = new Socket(() => 'ws://test:1234');
    await awaitEvent(socket, 'open');

    socket.send({ abc: 'foo' });
    assert.calledWith(fakeSocket.send, '{"abc":"foo"}');
  });

  it('should emit "message" event for received messages', async () => {
    const socket = new Socket(() => 'ws://test:1234');
    const onMessage = sinon.stub();
    socket.on('message', onMessage);

    await awaitEvent(socket, 'open');
    fakeSocket.simulateMessage('Test message');

    assert.calledWith(onMessage, sinon.match({ data: 'Test message' }));
  });

  it('should emit "error" event if `getURL` callback fails', async () => {
    const socket = new Socket(async () => {
      throw new Error('Auth token fetch failed');
    });
    const onError = sinon.stub();
    socket.on('error', onError);

    await awaitEvent(socket, 'error');

    assert.calledOnce(onError);
    const event = onError.getCall(0).args[0];
    assert.instanceOf(event, ErrorEvent);
    assert.equal(event.error.message, 'Failed to get WebSocket URL');
    assert.equal(event.error.cause.message, 'Auth token fetch failed');
  });

  it('should emit "error" event for received errors', async () => {
    const socket = new Socket(() => 'ws://test:1234');
    const onError = sinon.stub();
    socket.on('error', onError);
    await awaitEvent(socket, 'open');

    fakeSocket.simulateError('Something went wrong');

    assert.calledWith(
      onError,
      sinon.match({ message: 'Something went wrong' })
    );
  });

  describe('#close', () => {
    it('should close the socket with a normal status', async () => {
      const socket = new Socket(() => 'ws://test:1234');
      await awaitEvent(socket, 'open');
      socket.close();
      assert.calledWith(fakeSocket.close, CLOSE_NORMAL);
    });

    it('should not reconnect after closing', async () => {
      const socket = new Socket(() => 'ws://test:1234');
      await awaitEvent(socket, 'open');
      const initialSocket = fakeSocket;

      socket.close();

      clock.tick(2000);
      assert.equal(fakeSocket, initialSocket);
    });
  });

  describe('#isConnected', () => {
    it('returns true if WebSocket is connected', async () => {
      const socket = new Socket(() => 'ws://test:1234');
      assert.isFalse(socket.isConnected());

      await awaitEvent(socket, 'open');

      assert.isTrue(socket.isConnected());
    });
  });
});
