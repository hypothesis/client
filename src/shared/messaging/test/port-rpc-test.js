import { PortRPC } from '../port-rpc';

describe('PortRPC', () => {
  let port1;
  let port2;
  let rpc1;
  let rpc2;
  let plusOne;

  /**
   * Wait for a specific PortRPC method call to be delivered to a port.
   *
   * @param {MessagePort} port
   * @param {string} method
   * @param {number} [count]
   */
  function waitForMessage(port, method, count = 1) {
    let receivedCount = 0;

    return new Promise(resolve => {
      const onMessage = e => {
        if (e.data.method === method) {
          ++receivedCount;
          if (receivedCount >= count) {
            resolve();
            port.removeEventListener('message', onMessage);
          }
        }
      };
      port.addEventListener('message', onMessage);
    });
  }

  /**
   * Wait briefly to allow any pending MessagePort messages to be delivered.
   *
   * Browsers don't guarantee how long message delivery will take, though it
   * almost always happens after one macrotask, so there is a small risk this
   * doesn't wait long enough. Use this only for scenarios (eg. just before
   * asserting that a message was not delivered) where that is acceptable.
   */
  function waitForMessageDelivery() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    const channel = new MessageChannel();
    port1 = channel.port1;
    port2 = channel.port2;

    // `concat` method for rpc1
    const concat = (arg0, ...args) => {
      const callback = args.pop();
      const result = arg0.concat(...args);
      callback(result);
    };

    rpc1 = new PortRPC();
    rpc1.on('concat', concat);
    rpc1.connect(port1);

    // `plusOne` method for rpc2
    plusOne = sinon.stub().callsFake((...numbers) => {
      const callback = numbers.pop();
      const result = numbers.map(value => value + 1);
      callback(result);
    });

    rpc2 = new PortRPC();
    rpc2.on('plusOne', plusOne);
    rpc2.connect(port2);
  });

  afterEach(() => {
    rpc1.destroy();
    rpc2.destroy();

    // Restore any temporarily mocked DOM APIs.
    sinon.restore();
  });

  it('should call the method `plusOne` on rpc2', async () => {
    const { promise, resolve } = Promise.withResolvers();
    rpc1.call('plusOne', 1, 2, 3, resolve);

    const value = await promise;
    assert.deepEqual(value, [2, 3, 4]);
  });

  it('should not call the method `plusOne` if rpc1 is destroyed', () => {
    rpc1.destroy();

    rpc1.call('plusOne', 1, 2, 3);
    assert.notCalled(plusOne);
  });

  it('should not call the method `plusOne` if rpc2 is destroyed', async () => {
    rpc2.destroy();

    rpc1.call('plusOne', 1, 2, 3, () => {});

    await waitForMessageDelivery();
    assert.notCalled(plusOne);
  });

  it('should call the method `concat` on rpc1', async () => {
    const { promise: promiseOne, resolve: resolvePromiseOne } =
      Promise.withResolvers();
    rpc2.call('concat', 'hello', ' ', 'world', resolvePromiseOne);
    const valueOne = await promiseOne;
    assert.equal(valueOne, 'hello world');

    const { promise: promiseTwo, resolve: resolvePromiseTwo } =
      Promise.withResolvers();
    rpc2.call('concat', [1], [2], [3], resolvePromiseTwo);
    const valueTwo = await promiseTwo;
    assert.deepEqual(valueTwo, [1, 2, 3]);
  });

  it('should call method on valid message', async () => {
    port1.postMessage({
      arguments: [1, 2],
      method: 'plusOne',
      protocol: 'frame-rpc',
      version: '1.0.0',
    });

    await waitForMessage(port2, 'plusOne');
    assert.calledOnce(plusOne);
  });

  [
    {
      message: {
        arguments: 'test',
        method: 'plusOne',
        protocol: 'frame-rpc',
        version: '1.0.0',
      },
      reason: 'message has incorrect arguments',
    },

    {
      message: {
        arguments: [1, 2],
        method: 'dummy',
        protocol: 'frame-rpc',
        version: '1.0.0',
      },
      reason: 'message has incorrect method',
    },
    {
      message: {
        arguments: [1, 2],
        method: 'plusOne',
        protocol: 'dummy',
        version: '1.0.0',
      },
      reason: 'message has incorrect protocol',
    },

    {
      message: {
        arguments: [1, 2],
        method: 'plusOne',
        protocol: 'frame-rpc',
        version: 'dummy',
      },
      reason: 'message has incorrect version',
    },
    { message: {}, reason: 'message is an empty object' },
    { message: null, reason: 'message is `null`' },
    { message: undefined, reason: 'message is `undefined`' },
    { message: 0, reason: 'message is `0`' },
    { message: '', reason: 'message is empty string' },
    { message: 'dummy', reason: 'message is a string' },
  ].forEach(({ message, reason }) =>
    it(`should not call method on invalid messages (${reason})`, async () => {
      port1.postMessage(message);

      await waitForMessageDelivery();
      assert.notCalled(plusOne);
    }),
  );

  it('throws an error if `on` is called after `connect`', () => {
    const { port1 } = new MessageChannel();
    const rpc = new PortRPC();

    rpc.connect(port1);
    assert.throws(() => {
      rpc.on('foo', () => {});
    }, 'Cannot add a method handler after a port is connected');
  });

  it('should queue RPC requests made before port is connected', async () => {
    const { port1, port2 } = new MessageChannel();
    const sender = new PortRPC();

    const receiver = new PortRPC();
    const testMethod = sinon.stub();
    receiver.on('test', testMethod);
    receiver.connect(port2);

    sender.call('test', 'first', 'call');
    sender.call('test', 'second', 'call');
    sender.connect(port1);

    await waitForMessage(port2, 'test', 2);
    assert.calledWith(testMethod, 'first', 'call');
    assert.calledWith(testMethod, 'second', 'call');
  });

  it('should send "connect" event after connection', async () => {
    const { port1, port2 } = new MessageChannel();
    const sender = new PortRPC();
    const receiver = new PortRPC();
    const connectHandler = sinon.stub();

    receiver.on('connect', connectHandler);
    receiver.connect(port2);
    sender.connect(port1);

    await waitForMessage(port2, 'connect');

    assert.calledWith(connectHandler);
  });

  it('should send "close" event after port is destroyed', async () => {
    const { port1, port2 } = new MessageChannel();
    const sender = new PortRPC();
    const receiver = new PortRPC();
    const closeHandler = sinon.stub();

    receiver.on('close', closeHandler);
    receiver.connect(port2);
    sender.connect(port1);
    await waitForMessageDelivery();

    assert.notCalled(closeHandler);
    sender.destroy();
    await waitForMessage(port2, 'close');

    assert.calledOnce(closeHandler);
    assert.calledWith(closeHandler);
  });

  it('should send "close" event when window is unloaded', async () => {
    const { port1, port2 } = new MessageChannel();
    const sender = new PortRPC({ forceUnloadListener: true });
    const receiver = new PortRPC();
    const closeHandler = sinon.stub();

    receiver.on('close', closeHandler);
    receiver.connect(port2);
    sender.connect(port1);
    await waitForMessageDelivery();

    assert.notCalled(closeHandler);
    window.dispatchEvent(new Event('unload'));
    await waitForMessage(port2, 'close');

    assert.calledOnce(closeHandler);
    assert.calledWith(closeHandler);
  });

  // See https://github.com/hypothesis/support/issues/161#issuecomment-2454560641
  it('ignores "fake" window unload events', async () => {
    const { port1, port2 } = new MessageChannel();
    const sender = new PortRPC({ forceUnloadListener: true });
    const receiver = new PortRPC();
    const closeHandler = sinon.stub();

    receiver.on('close', closeHandler);
    receiver.connect(port2);
    sender.connect(port1);
    await waitForMessageDelivery();

    assert.notCalled(closeHandler);
    window.dispatchEvent(new CustomEvent('unload'));
    await waitForMessageDelivery();

    assert.notCalled(closeHandler);
  });

  it('should send "close" event when MessagePort emits "close" event', async () => {
    const { port1, port2 } = new MessageChannel();
    const sender = new PortRPC();
    const receiver = new PortRPC();
    const closeHandler = sinon.stub();

    receiver.on('close', closeHandler);
    receiver.connect(port2);
    sender.connect(port1);
    await waitForMessageDelivery();

    assert.notCalled(closeHandler);
    const closed = waitForMessage(port2, 'close');
    port2.dispatchEvent(new Event('close'));
    await closed;

    assert.calledOnce(closeHandler);
    assert.calledWith(closeHandler);
  });

  it('should only invoke "close" handler once', async () => {
    const { port1, port2 } = new MessageChannel();
    const sender = new PortRPC();
    const receiver = new PortRPC();
    const closeHandler = sinon.stub();

    receiver.on('close', closeHandler);
    receiver.connect(port2);
    sender.connect(port1);

    // Invoke "close" manually. In a real app it will be invoked when the
    // window is unloaded and/or the PortRPC is destroyed.
    sender.call('close');
    sender.call('close');

    await waitForMessage(port2, 'close');

    assert.calledOnce(closeHandler);
  });
});
