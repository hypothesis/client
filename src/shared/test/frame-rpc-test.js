import { RPC } from '../frame-rpc';

describe('shared/bridge', () => {
  let port1;
  let port2;
  let rpc1;
  let rpc2;
  let plusOne;

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

    rpc1 = new RPC(
      /** dummy when using ports */ window,
      port1,
      /** dummy when using ports */ '*',
      {
        concat,
      }
    );

    // `plusOne` method for rpc2
    plusOne = sinon.stub().callsFake((...numbers) => {
      const callback = numbers.pop();
      const result = numbers.map(value => value + 1);
      callback(result);
    });

    rpc2 = new RPC(
      /** dummy when using ports */ window,
      port2,
      /** dummy when using ports */ '*',
      {
        plusOne,
      }
    );
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

  it('should not call the method `plusOne` if rpc2 is destroyed', done => {
    rpc2.destroy();

    rpc1.call('plusOne', 1, 2, 3, () => {
      done(new Error('Unexpected call'));
    });

    setTimeout(() => {
      assert.notCalled(plusOne);
      done();
    }, 100);
  });

  it('should call the method `concat` on rpc1', done => {
    rpc2.call('concat', 'hello', ' ', 'world', value => {
      assert.equal(value, 'hello world');
      done();
    });

    rpc2.call('concat', [1], [2], [3], value => {
      assert.deepEqual(value, [1, 2, 3]);
      done();
    });
  });

  it('should ignore invalid messages', done => {
    // Correct message
    port1.postMessage({
      arguments: [1, 2],
      method: 'plusOne',
      protocol: 'frame-rpc',
      version: '1.0.0',
    });

    // Incorrect argument
    port1.postMessage({
      arguments: 'test',
      method: 'plusOne',
      protocol: 'frame-rpc',
      version: '1.0.0',
    });

    // Incorrect method
    port1.postMessage({
      arguments: [1, 2],
      method: 'dummy',
      protocol: 'frame-rpc',
      version: '1.0.0',
    });

    // Incorrect protocol
    port1.postMessage({
      arguments: [1, 2],
      method: 'plusOne',
      protocol: 'dummy',
      version: '1.0.0',
    });

    // Incorrect version
    port1.postMessage({
      arguments: [1, 2],
      method: 'plusOne',
      protocol: 'frame-rpc',
      version: 'dummy',
    });

    // All incorrect
    port1.postMessage({});
    port1.postMessage(null);
    port1.postMessage(undefined);
    port1.postMessage(0);
    port1.postMessage('');
    port1.postMessage('dummy');

    setTimeout(() => {
      assert.calledOnce(plusOne);
      done();
    }, 100);
  });
});
