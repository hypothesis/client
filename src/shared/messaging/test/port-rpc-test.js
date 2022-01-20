import { PortRPC } from '../port-rpc';

describe('PortRPC', () => {
  let port1;
  let port2;
  let rpc1;
  let rpc2;
  let plusOne;

  /**
   * Wait for messages enqueued via `postMessage` to be delivered.
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
  });

  it('should call the method `plusOne` on rpc2', done => {
    rpc1.call('plusOne', 1, 2, 3, value => {
      assert.deepEqual(value, [2, 3, 4]);
      done();
    });
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

  it('should call the method `concat` on rpc1', done => {
    rpc2.call('concat', 'hello', ' ', 'world', value => {
      assert.equal(value, 'hello world');
    });

    rpc2.call('concat', [1], [2], [3], value => {
      assert.deepEqual(value, [1, 2, 3]);
      done();
    });
  });

  it('should call method on valid message', async () => {
    port1.postMessage({
      arguments: [1, 2],
      method: 'plusOne',
      protocol: 'frame-rpc',
      version: '1.0.0',
    });

    await waitForMessageDelivery();
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
    })
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

    await waitForMessageDelivery();
    assert.calledWith(testMethod, 'first', 'call');
    assert.calledWith(testMethod, 'second', 'call');
  });

  describe('#disconnect', () => {
    it('disconnects and returns port', async () => {
      const rpc = new PortRPC();
      const testMethod = sinon.stub();
      rpc.on('test', testMethod);

      assert.isNull(rpc.disconnect());

      const { port1 } = new MessageChannel();
      rpc.connect(port1);

      assert.equal(rpc.disconnect(), port1);
      assert.isNull(rpc.disconnect());

      rpc.call('test');
      await waitForMessageDelivery();
      assert.notCalled(testMethod);
    });
  });
});
