import {
  Socket,
  CLOSE_NORMAL,
  CLOSE_GOING_AWAY,
  CLOSE_ABNORMAL,
} from '../websocket';

describe('websocket wrapper', () => {
  let fakeSocket;
  let clock;

  class FakeWebSocket {
    constructor() {
      this.close = sinon.stub();
      this.send = sinon.stub();
      fakeSocket = this; // eslint-disable-line consistent-this
    }
  }
  FakeWebSocket.OPEN = 1;

  const WebSocket = window.WebSocket;

  beforeEach(() => {
    globalThis.WebSocket = FakeWebSocket;
    clock = sinon.useFakeTimers();

    // Suppress warnings of WebSocket issues in tests for handling
    // of abnormal disconnections
    sinon.stub(console, 'warn');
    sinon.stub(console, 'error');
  });

  afterEach(() => {
    globalThis.WebSocket = WebSocket;
    clock.restore();
    console.warn.restore();
    console.error.restore();
  });

  context('when the connection is closed by the browser or server', () => {
    it('should emit "disconnect" event after an abnormal disconnection', () => {
      const onDisconnect = sinon.stub();
      const socket = new Socket('ws://test:1234');
      socket.on('disconnect', onDisconnect);

      assert.ok(fakeSocket);

      fakeSocket.onopen({});
      fakeSocket.onclose({ code: CLOSE_ABNORMAL });

      assert.calledOnce(onDisconnect);
    });

    [CLOSE_NORMAL, CLOSE_GOING_AWAY].forEach(closeCode => {
      it('should not emit "disconnect" after a normal disconnection', () => {
        const onDisconnect = sinon.stub();
        const socket = new Socket('ws://test:1234');
        socket.on('disconnect', onDisconnect);

        assert.ok(fakeSocket);

        fakeSocket.onopen({});
        fakeSocket.onclose({ code: closeCode });

        assert.notCalled(onDisconnect);
      });
    });
  });

  it('should queue messages sent prior to connection', () => {
    const socket = new Socket('ws://test:1234');
    socket.send({ abc: 'foo' });
    assert.notCalled(fakeSocket.send);
    fakeSocket.onopen({});
    assert.calledWith(fakeSocket.send, '{"abc":"foo"}');
  });

  it('should send messages immediately when connected', () => {
    const socket = new Socket('ws://test:1234');
    fakeSocket.readyState = FakeWebSocket.OPEN;
    socket.send({ abc: 'foo' });
    assert.calledWith(fakeSocket.send, '{"abc":"foo"}');
  });

  it('should emit "message" event for received messages', () => {
    const socket = new Socket('ws://test:1234');
    const onMessage = sinon.stub();
    socket.on('message', onMessage);

    const event = new MessageEvent('message', {
      data: 'Test message',
    });
    fakeSocket.onmessage(event);

    assert.calledWith(onMessage, event);
  });

  it('should emit "error" event for received errors', () => {
    const socket = new Socket('ws://test:1234');
    const onError = sinon.stub();
    socket.on('error', onError);

    const event = new ErrorEvent('Something went wrong');
    fakeSocket.onerror(event);

    assert.calledWith(onError, event);
  });

  describe('#close', () => {
    it('should close the socket with a normal status', () => {
      const socket = new Socket('ws://test:1234');
      socket.close();
      assert.calledWith(fakeSocket.close, CLOSE_NORMAL);
    });

    it('should not reconnect after closing', () => {
      const socket = new Socket('ws://test:1234');
      const initialSocket = fakeSocket;

      socket.close();

      clock.tick(2000);
      assert.equal(fakeSocket, initialSocket);
    });
  });
});
