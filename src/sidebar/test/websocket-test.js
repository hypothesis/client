import Socket, {
  CLOSE_NORMAL,
  CLOSE_GOING_AWAY,
  CLOSE_ABNORMAL,
} from '../websocket';

describe('websocket wrapper', function () {
  let fakeSocket;
  let clock;

  function FakeWebSocket() {
    this.close = sinon.stub();
    this.send = sinon.stub();
    fakeSocket = this; // eslint-disable-line consistent-this
  }
  FakeWebSocket.OPEN = 1;

  const WebSocket = window.WebSocket;

  beforeEach(function () {
    global.WebSocket = FakeWebSocket;
    clock = sinon.useFakeTimers();

    // suppress warnings of WebSocket issues in tests for handling
    // of abnormal disconnections
    sinon.stub(console, 'warn');
  });

  afterEach(function () {
    global.WebSocket = WebSocket;
    clock.restore();
    console.warn.restore();
  });

  context('when the connection is closed by the browser or server', () => {
    it('should reconnect after an abnormal disconnection', function () {
      new Socket('ws://test:1234');
      assert.ok(fakeSocket);
      const initialSocket = fakeSocket;
      fakeSocket.onopen({});
      fakeSocket.onclose({ code: CLOSE_ABNORMAL });
      clock.tick(2000);
      assert.ok(fakeSocket);
      assert.notEqual(fakeSocket, initialSocket);
    });

    it('should reconnect if initial connection fails', function () {
      new Socket('ws://test:1234');
      assert.ok(fakeSocket);
      const initialSocket = fakeSocket;
      fakeSocket.onopen({});
      fakeSocket.onclose({ code: CLOSE_ABNORMAL });
      clock.tick(4000);
      assert.ok(fakeSocket);
      assert.notEqual(fakeSocket, initialSocket);
    });

    it('should send queued messages after a reconnect', function () {
      // simulate WebSocket setup and initial connection
      const socket = new Socket('ws://test:1234');
      fakeSocket.onopen({});

      // simulate abnormal disconnection
      fakeSocket.onclose({ code: CLOSE_ABNORMAL });

      // enqueue a message and check that it is sent after the WS reconnects
      socket.send({ aKey: 'aValue' });
      fakeSocket.onopen({});
      assert.calledWith(fakeSocket.send, '{"aKey":"aValue"}');
    });

    [CLOSE_NORMAL, CLOSE_GOING_AWAY].forEach(closeCode => {
      it('should not reconnect after a normal disconnection', function () {
        new Socket('ws://test:1234');
        assert.ok(fakeSocket);
        const initialSocket = fakeSocket;

        fakeSocket.onopen({});
        fakeSocket.onclose({ code: closeCode });
        clock.tick(4000);

        assert.ok(fakeSocket);
        assert.equal(fakeSocket, initialSocket);
      });
    });
  });

  it('should queue messages sent prior to connection', function () {
    const socket = new Socket('ws://test:1234');
    socket.send({ abc: 'foo' });
    assert.notCalled(fakeSocket.send);
    fakeSocket.onopen({});
    assert.calledWith(fakeSocket.send, '{"abc":"foo"}');
  });

  it('should send messages immediately when connected', function () {
    const socket = new Socket('ws://test:1234');
    fakeSocket.readyState = FakeWebSocket.OPEN;
    socket.send({ abc: 'foo' });
    assert.calledWith(fakeSocket.send, '{"abc":"foo"}');
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
